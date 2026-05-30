package cli

import (
	"fmt"
	"slices"
	"strings"

	"github.com/itseffi/productize/internal/core/model"
	"github.com/itseffi/productize/internal/core/tasks"
	"github.com/spf13/cobra"
)

type taskRuntimeEditor struct {
	IDE             string
	Model           string
	ReasoningEffort string
}

type taskRuntimeTypeOption struct {
	Value string
	Label string
}

type taskRuntimeTaskOption struct {
	ID    string
	Type  string
	Label string
}

type taskRunRuntimeForm struct {
	selectedTypes []string
	selectedTasks []string
	typeOptions   []taskRuntimeTypeOption
	taskOptions   []taskRuntimeTaskOption
	typeEditors   map[string]*taskRuntimeEditor
	taskEditors   map[string]*taskRuntimeEditor
	baseRuntime   string
}

func collectTaskRunRuntimeForm(cmd *cobra.Command, state *commandState) error {
	if state == nil || state.kind != commandKindTasksRun {
		return nil
	}

	form, err := newTaskRunRuntimeForm(state)
	if err != nil || form == nil {
		return err
	}
	if err := form.run(newPromptSession(cmd)); err != nil {
		return fmt.Errorf("task runtime form canceled or error: %w", err)
	}
	form.apply(state)
	markInputFlagChanged(cmd, "task-runtime")
	return nil
}

func newTaskRunRuntimeForm(state *commandState) (*taskRunRuntimeForm, error) {
	tasksDir, err := resolveTaskWorkflowDir(state.workspaceRoot, state.name, state.tasksDir)
	if err != nil {
		return nil, err
	}
	entries, err := tasks.ReadTaskEntries(tasksDir, state.includeCompleted)
	if err != nil {
		return nil, fmt.Errorf("read task entries for runtime overrides: %w", err)
	}
	if len(entries) == 0 {
		return nil, nil
	}

	form := &taskRunRuntimeForm{
		typeEditors: make(map[string]*taskRuntimeEditor),
		taskEditors: make(map[string]*taskRuntimeEditor),
		baseRuntime: formatBaseTaskRuntime(state),
	}
	typeRuleByValue, taskRuleByID := indexTaskRuntimeRules(state.taskRuntimeRules())
	if err := form.populate(entries, typeRuleByValue, taskRuleByID); err != nil {
		return nil, err
	}
	form.ensureEditors()
	return form, nil
}

func (f *taskRunRuntimeForm) run(session promptSession) error {
	if err := session.writePromptHeader(
		"Per-Task Runtime",
		taskRuntimeSelectionDescription(f.baseRuntime),
	); err != nil {
		return err
	}
	if len(f.typeOptions) > 0 {
		options := make([]promptOption, 0, len(f.typeOptions))
		for _, option := range f.typeOptions {
			options = append(options, promptOption{Label: option.Label, Value: option.Value})
		}
		selected, err := session.selectMany(
			"Task Types",
			"Select task types to override in bulk.",
			options,
			f.selectedTypes,
		)
		if err != nil {
			return err
		}
		f.selectedTypes = selected
	}
	if len(f.taskOptions) > 0 {
		options := make([]promptOption, 0, len(f.taskOptions))
		for _, option := range f.taskOptions {
			options = append(options, promptOption{Label: option.Label, Value: option.ID})
		}
		selected, err := session.selectMany(
			"Specific Tasks",
			"Select individual tasks for exceptions or one-off runtime choices.",
			options,
			f.selectedTasks,
		)
		if err != nil {
			return err
		}
		f.selectedTasks = selected
	}
	for _, option := range f.typeOptions {
		if !slices.Contains(f.selectedTypes, option.Value) {
			continue
		}
		editor := f.typeEditors[option.Value]
		if err := promptTaskRuntimeEditor(
			session,
			"Type: "+option.Label,
			"Applies to every task with this type.",
			"Override the runtime for this task type",
			"Override reasoning for this task type",
			editor,
		); err != nil {
			return err
		}
	}
	for _, option := range f.taskOptions {
		if !slices.Contains(f.selectedTasks, option.ID) {
			continue
		}
		editor := f.taskEditors[option.ID]
		if err := promptTaskRuntimeEditor(
			session,
			"Task: "+option.Label,
			"Task-specific overrides win over type rules.",
			"Override the runtime for this task only",
			"Override reasoning for this task only",
			editor,
		); err != nil {
			return err
		}
	}
	return nil
}

func indexTaskRuntimeRules(
	rules []model.TaskRuntimeRule,
) (map[string]model.TaskRuntimeRule, map[string]model.TaskRuntimeRule) {
	typeRuleByValue := make(map[string]model.TaskRuntimeRule)
	taskRuleByID := make(map[string]model.TaskRuntimeRule)
	for _, rule := range rules {
		switch {
		case rule.Type != nil:
			typeRuleByValue[strings.TrimSpace(*rule.Type)] = rule
		case rule.ID != nil:
			taskRuleByID[strings.TrimSpace(*rule.ID)] = rule
		}
	}
	return typeRuleByValue, taskRuleByID
}

func (f *taskRunRuntimeForm) populate(
	entries []model.IssueEntry,
	typeRuleByValue map[string]model.TaskRuntimeRule,
	taskRuleByID map[string]model.TaskRuntimeRule,
) error {
	seenTypes := make(map[string]struct{})
	for _, entry := range entries {
		if err := f.addEntry(entry, seenTypes, typeRuleByValue, taskRuleByID); err != nil {
			return err
		}
	}
	return nil
}

func (f *taskRunRuntimeForm) addEntry(
	entry model.IssueEntry,
	seenTypes map[string]struct{},
	typeRuleByValue map[string]model.TaskRuntimeRule,
	taskRuleByID map[string]model.TaskRuntimeRule,
) error {
	taskData, err := tasks.ParseTaskFile(entry.Content)
	if err != nil {
		return tasks.WrapParseError(entry.AbsPath, err)
	}

	taskType := strings.TrimSpace(taskData.TaskType)
	f.addTypeOption(taskType, seenTypes, typeRuleByValue)

	id := strings.TrimSpace(entry.CodeFile)
	f.taskOptions = append(f.taskOptions, taskRuntimeTaskOption{
		ID:    id,
		Type:  taskType,
		Label: formatTaskRuntimeTaskLabel(entry.CodeFile, taskData.Title, taskType),
	})
	if rule, ok := taskRuleByID[id]; ok {
		f.selectedTasks = append(f.selectedTasks, id)
		f.taskEditors[id] = taskRuntimeEditorFromRule(rule)
	}
	return nil
}

func (f *taskRunRuntimeForm) addTypeOption(
	taskType string,
	seenTypes map[string]struct{},
	typeRuleByValue map[string]model.TaskRuntimeRule,
) {
	if taskType == "" {
		return
	}
	if _, ok := seenTypes[taskType]; !ok {
		f.typeOptions = append(f.typeOptions, taskRuntimeTypeOption{
			Value: taskType,
			Label: taskType,
		})
		seenTypes[taskType] = struct{}{}
	}
	if rule, ok := typeRuleByValue[taskType]; ok && !slices.Contains(f.selectedTypes, taskType) {
		f.selectedTypes = append(f.selectedTypes, taskType)
		f.typeEditors[taskType] = taskRuntimeEditorFromRule(rule)
	}
}

func (f *taskRunRuntimeForm) ensureEditors() {
	for _, opt := range f.typeOptions {
		if _, ok := f.typeEditors[opt.Value]; !ok {
			f.typeEditors[opt.Value] = &taskRuntimeEditor{}
		}
	}
	for _, opt := range f.taskOptions {
		if _, ok := f.taskEditors[opt.ID]; !ok {
			f.taskEditors[opt.ID] = &taskRuntimeEditor{}
		}
	}
}

func (f *taskRunRuntimeForm) apply(state *commandState) {
	state.replaceConfiguredTaskRunRules = true
	state.executionTaskRuntimeRules = nil

	for _, selectedType := range f.selectedTypes {
		rule := buildTaskRuntimeRuleForType(selectedType, f.typeEditors[selectedType])
		if rule.HasOverride() {
			state.executionTaskRuntimeRules = append(state.executionTaskRuntimeRules, rule)
		}
	}
	for _, selectedTask := range f.selectedTasks {
		rule := buildTaskRuntimeRuleForTask(selectedTask, f.taskEditors[selectedTask])
		if rule.HasOverride() {
			state.executionTaskRuntimeRules = append(state.executionTaskRuntimeRules, rule)
		}
	}
}

func buildTaskRuntimeRuleForType(taskType string, editor *taskRuntimeEditor) model.TaskRuntimeRule {
	rule := model.TaskRuntimeRule{Type: stringPointer(strings.TrimSpace(taskType))}
	applyTaskRuntimeEditor(&rule, editor)
	return rule
}

func buildTaskRuntimeRuleForTask(taskID string, editor *taskRuntimeEditor) model.TaskRuntimeRule {
	rule := model.TaskRuntimeRule{ID: stringPointer(strings.TrimSpace(taskID))}
	applyTaskRuntimeEditor(&rule, editor)
	return rule
}

func applyTaskRuntimeEditor(rule *model.TaskRuntimeRule, editor *taskRuntimeEditor) {
	if rule == nil || editor == nil {
		return
	}
	if ide := strings.TrimSpace(editor.IDE); ide != "" {
		rule.IDE = stringPointer(ide)
	}
	if modelName := strings.TrimSpace(editor.Model); modelName != "" {
		rule.Model = stringPointer(modelName)
	}
	if reasoning := strings.TrimSpace(editor.ReasoningEffort); reasoning != "" {
		rule.ReasoningEffort = stringPointer(reasoning)
	}
}

func taskRuntimeEditorFromRule(rule model.TaskRuntimeRule) *taskRuntimeEditor {
	editor := &taskRuntimeEditor{}
	if rule.IDE != nil {
		editor.IDE = strings.TrimSpace(*rule.IDE)
	}
	if rule.Model != nil {
		editor.Model = strings.TrimSpace(*rule.Model)
	}
	if rule.ReasoningEffort != nil {
		editor.ReasoningEffort = strings.TrimSpace(*rule.ReasoningEffort)
	}
	return editor
}

func promptTaskRuntimeEditor(
	session promptSession,
	title string,
	description string,
	ideDescription string,
	reasoningDescription string,
	editor *taskRuntimeEditor,
) error {
	if editor == nil {
		return nil
	}
	if err := session.writePromptHeader(title, description); err != nil {
		return err
	}
	ide, err := session.selectOne("IDE", ideDescription, taskRuntimeIDEOptions(), editor.IDE)
	if err != nil {
		return err
	}
	editor.IDE = ide
	modelName, err := session.input(
		"Model",
		"Leave empty to inherit from the current default or type rule.",
		"inherit default",
		editor.Model,
		nil,
	)
	if err != nil {
		return err
	}
	editor.Model = modelName
	reasoning, err := session.selectOne(
		"Reasoning Effort",
		reasoningDescription,
		reasoningPromptOptions(true),
		editor.ReasoningEffort,
	)
	if err != nil {
		return err
	}
	editor.ReasoningEffort = reasoning
	return nil
}

func taskRuntimeIDEOptions() []promptOption {
	options := []promptOption{{Label: "Inherit default", Value: ""}}
	options = append(options, ideCatalogOptions()...)
	return options
}

func taskRuntimeSelectionDescription(baseRuntime string) string {
	return "Base runtime: " + baseRuntime +
		"\nType rules apply before task-specific rules. Leave fields as inherit/blank to keep the base runtime."
}

func formatBaseTaskRuntime(state *commandState) string {
	if state == nil {
		return ""
	}
	label := strings.TrimSpace(state.ide)
	modelName := strings.TrimSpace(state.model)
	reasoning := strings.TrimSpace(state.reasoningEffort)
	parts := make([]string, 0, 3)
	if label != "" {
		parts = append(parts, label)
	}
	if modelName != "" {
		parts = append(parts, "model "+modelName)
	}
	if reasoning != "" {
		parts = append(parts, "reasoning "+reasoning)
	}
	return strings.Join(parts, " · ")
}

func formatTaskRuntimeTaskLabel(id, title, taskType string) string {
	labelTitle := strings.TrimSpace(title)
	if labelTitle == "" {
		labelTitle = id
	}
	if strings.TrimSpace(taskType) == "" {
		return fmt.Sprintf("%s — %s", id, labelTitle)
	}
	return fmt.Sprintf("%s — %s [%s]", id, labelTitle, taskType)
}
