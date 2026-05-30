package cli

import (
	"encoding/csv"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	core "github.com/itseffi/productize/internal/core"
	"github.com/itseffi/productize/internal/core/agent"
	"github.com/itseffi/productize/internal/core/model"
	"github.com/itseffi/productize/internal/core/provider"
	"github.com/itseffi/productize/internal/core/providerdefaults"
	"github.com/itseffi/productize/internal/core/tasks"
	"github.com/spf13/cobra"
)

const workflowNameTitle = "Workflow Name"

func collectFormParams(cmd *cobra.Command, state *commandState) error {
	fmt.Fprintln(cmd.OutOrStdout())
	fmt.Fprintln(cmd.OutOrStdout(), renderFormIntro())
	inputs := newFormInputsFromState(state)
	builder := newFormBuilder(cmd, state)
	inputs.register(builder)
	if err := builder.run(newPromptSession(cmd)); err != nil {
		return fmt.Errorf("form canceled or error: %w", err)
	}
	inputs.apply(cmd, state)
	if state.kind == commandKindTasksRun && inputs.defineTaskRuntime {
		if err := collectTaskRunRuntimeForm(cmd, state); err != nil {
			return err
		}
	} else if state.kind == commandKindTasksRun {
		clearTaskRunRuntimeRules(state)
		markInputFlagChanged(cmd, "task-runtime")
	}
	fmt.Fprintln(cmd.OutOrStdout())
	fmt.Fprintln(cmd.OutOrStdout(), renderFormSuccess())
	return nil
}

func clearTaskRunRuntimeRules(state *commandState) {
	if state == nil {
		return
	}
	state.configuredTaskRuntimeRules = nil
	state.executionTaskRuntimeRules = nil
	state.replaceConfiguredTaskRunRules = true
}

type formInputs struct {
	name              string
	pr                string
	provider          string
	round             string
	reviewsDir        string
	tasksDir          string
	concurrent        string
	batchSize         string
	ide               string
	model             string
	addDirs           string
	reasoningEffort   string
	defineTaskRuntime bool
	includeCompleted  bool
	includeResolved   bool
	dryRun            bool
	autoCommit        bool
}

func newFormInputs() *formInputs {
	return &formInputs{}
}

func newFormInputsFromState(state *commandState) *formInputs {
	inputs := newFormInputs()
	if state == nil {
		return inputs
	}

	inputs.name = state.name
	inputs.pr = state.pr
	inputs.provider = state.provider
	if state.round > 0 {
		inputs.round = strconv.Itoa(state.round)
	}
	inputs.reviewsDir = state.reviewsDir
	inputs.tasksDir = state.tasksDir
	if state.concurrent > 0 {
		inputs.concurrent = strconv.Itoa(state.concurrent)
	}
	if state.batchSize > 0 {
		inputs.batchSize = strconv.Itoa(state.batchSize)
	}
	inputs.ide = state.ide
	inputs.model = state.model
	if len(state.addDirs) > 0 {
		inputs.addDirs = formatAddDirInput(state.addDirs)
	}
	inputs.reasoningEffort = state.reasoningEffort
	inputs.defineTaskRuntime = len(state.taskRuntimeRules()) > 0
	inputs.includeCompleted = state.includeCompleted
	inputs.includeResolved = state.includeResolved
	inputs.dryRun = state.dryRun
	inputs.autoCommit = state.autoCommit

	return inputs
}

func (fi *formInputs) register(builder *formBuilder) {
	builder.addNameField(&fi.name)
	builder.addPRField(&fi.pr)
	builder.addProviderField(&fi.provider)
	builder.addRoundField(&fi.round)
	builder.addReviewsDirField(&fi.reviewsDir)
	builder.addTasksDirField(&fi.tasksDir)
	builder.addConcurrentField(&fi.concurrent)
	builder.addBatchSizeField(&fi.batchSize)
	builder.addIDEField(&fi.ide)
	builder.addModelField(&fi.model)
	builder.addAddDirsField(&fi.addDirs)
	builder.addReasoningEffortField(&fi.reasoningEffort)
	if builder.state != nil && builder.state.kind == commandKindTasksRun {
		builder.addVirtualField("define-task-runtime", func() promptStep {
			return func(session promptSession) error {
				value, err := session.confirm(
					"Define Runtime Per Task?",
					"Open a second round to configure runtime overrides by task type or task id.",
					fi.defineTaskRuntime,
				)
				if err != nil {
					return err
				}
				fi.defineTaskRuntime = value
				return nil
			}
		})
	}
	builder.addConfirmField(
		"dry-run",
		"Dry Run?",
		"Only generate prompts without running IDE tool",
		&fi.dryRun,
	)
	builder.addConfirmField(
		"auto-commit",
		"Auto Commit?",
		"Include commit instructions at task/batch completion",
		&fi.autoCommit,
	)
	builder.addConfirmField(
		"include-completed",
		"Include Completed Tasks?",
		"Process tasks marked as completed",
		&fi.includeCompleted,
	)
	builder.addConfirmField(
		"include-resolved",
		"Include Resolved Review Issues?",
		"Process issues already marked as resolved",
		&fi.includeResolved,
	)
}

func (fi *formInputs) apply(cmd *cobra.Command, state *commandState) {
	applyInput(cmd, "name", fi.name, passThroughInput[string], func(val string) { state.name = val })
	applyInput(cmd, "pr", fi.pr, passThroughInput[string], func(val string) { state.pr = val })
	applyInput(cmd, "provider", fi.provider, passThroughInput[string], func(val string) { state.provider = val })
	applyInput(cmd, "round", fi.round, parseIntInput, func(val int) { state.round = val })
	applyInput(cmd, "reviews-dir", fi.reviewsDir, passThroughInput[string], func(val string) { state.reviewsDir = val })
	applyInput(cmd, "tasks-dir", fi.tasksDir, passThroughInput[string], func(val string) { state.tasksDir = val })
	applyInput(cmd, "concurrent", fi.concurrent, parseIntInput, func(val int) { state.concurrent = val })
	applyInput(cmd, "batch-size", fi.batchSize, parseIntInput, func(val int) { state.batchSize = val })
	applyInput(cmd, "ide", fi.ide, passThroughInput[string], func(val string) { state.ide = val })
	applyInput(cmd, "model", fi.model, passThroughInput[string], func(val string) { state.model = val })
	applyInput(cmd, "add-dir", fi.addDirs, parseStringSliceInput, func(val []string) { state.addDirs = val })
	applyInput(cmd, "reasoning-effort", fi.reasoningEffort, passThroughInput[string], func(val string) {
		state.reasoningEffort = val
	})
	applyInput(cmd, "dry-run", fi.dryRun, passThroughInput[bool], func(val bool) { state.dryRun = val })
	applyInput(cmd, "auto-commit", fi.autoCommit, passThroughInput[bool], func(val bool) { state.autoCommit = val })
	applyInput(cmd, "include-completed", fi.includeCompleted, passThroughInput[bool], func(val bool) {
		state.includeCompleted = val
	})
	applyInput(cmd, "include-resolved", fi.includeResolved, passThroughInput[bool], func(val bool) {
		state.includeResolved = val
	})
}

type formBuilder struct {
	cmd             *cobra.Command
	state           *commandState
	fields          []promptField
	nameFromDirList bool
	tasksBaseDir    string
}

type promptStep func(promptSession) error

type promptField struct {
	key string
	run promptStep
}

func newFormBuilder(cmd *cobra.Command, state *commandState) *formBuilder {
	return &formBuilder{
		cmd:          cmd,
		state:        state,
		tasksBaseDir: model.TasksBaseDirForWorkspace(state.workspaceRoot),
	}
}

func (fb *formBuilder) run(session promptSession) error {
	for _, field := range fb.fields {
		if field.run == nil {
			continue
		}
		if err := field.run(session); err != nil {
			return err
		}
	}
	return nil
}

func (fb *formBuilder) hasFlag(flag string) bool {
	return fb.cmd.Flags().Lookup(flag) != nil
}

func (fb *formBuilder) addField(flag string, build func() promptStep) {
	if !fb.hasFlag(flag) || fb.cmd.Flags().Changed(flag) || fb.hideField(flag) {
		return
	}
	fb.addBuiltField(flag, build)
}

func (fb *formBuilder) addVirtualField(key string, build func() promptStep) {
	fb.addBuiltField(key, build)
}

func (fb *formBuilder) addBuiltField(key string, build func() promptStep) {
	field := build()
	if field != nil {
		fb.fields = append(fb.fields, promptField{key: key, run: field})
	}
}

func (fb *formBuilder) hideField(flag string) bool {
	if flag == "tasks-dir" && fb.nameFromDirList {
		return true
	}

	switch fb.state.kind {
	case commandKindTasksRun:
		switch flag {
		case "concurrent", "dry-run", "include-completed":
			return true
		}
	case commandKindFixReviews:
		switch flag {
		case "dry-run", "include-resolved":
			return true
		}
	}

	return false
}

func (fb *formBuilder) addNameField(target *string) {
	fb.addField("name", func() promptStep {
		title, description, dirs := fb.nameFieldOptions()
		if len(dirs) > 0 {
			fb.nameFromDirList = true
			options := make([]promptOption, 0, len(dirs))
			for _, d := range dirs {
				options = append(options, promptOption{Label: d, Value: d})
			}
			return func(session promptSession) error {
				value, err := session.selectOne(title, description, options, *target)
				if err != nil {
					return err
				}
				*target = value
				return nil
			}
		}

		title, description = fb.nameInputLabels()
		return func(session promptSession) error {
			value, err := session.input(title, description, "my-feature", *target, func(str string) error {
				if strings.TrimSpace(str) == "" && !fb.hasFlag("reviews-dir") {
					return errors.New("name is required")
				}
				return nil
			})
			if err != nil {
				return err
			}
			*target = value
			return nil
		}
	})
}

func (fb *formBuilder) nameFieldOptions() (string, string, []string) {
	switch fb.state.kind {
	case commandKindTasksRun:
		return "Task Name", "Select the task directory to run", listTaskRunSubdirs(fb.tasksBaseDir)
	case commandKindFixReviews:
		return workflowNameTitle, "Select the workflow directory for review fixes", listTaskSubdirs(fb.tasksBaseDir)
	case commandKindFetchReviews:
		return workflowNameTitle, "Select the workflow directory to fetch reviews into", listTaskSubdirs(
			fb.tasksBaseDir,
		)
	case commandKindWatchReviews:
		return workflowNameTitle, "Select the workflow directory for review watch", listTaskSubdirs(fb.tasksBaseDir)
	default:
		return "", "", nil
	}
}

func (fb *formBuilder) nameInputLabels() (string, string) {
	if fb.state.kind == commandKindTasksRun {
		return "Task Name", "Required: task workflow name (for example: multi-repo)"
	}
	return workflowNameTitle, "Required: workflow name (for example: my-feature)"
}

func (fb *formBuilder) addPRField(target *string) {
	fb.addField("pr", func() promptStep {
		return func(session promptSession) error {
			value, err := session.input(
				"Pull Request",
				"Required: pull request number to fetch reviews from",
				"259",
				*target,
				func(str string) error {
					if strings.TrimSpace(str) == "" {
						return errors.New("pull request number is required")
					}
					return nil
				},
			)
			if err != nil {
				return err
			}
			*target = value
			return nil
		}
	})
}

func (fb *formBuilder) addProviderField(target *string) {
	fb.addField("provider", func() promptStep {
		options := providerCatalogOptions()
		if len(options) == 0 {
			options = []promptOption{{Label: "CodeRabbit", Value: "coderabbit"}}
		}
		return func(session promptSession) error {
			value, err := session.selectOne(
				"Review Provider",
				"Choose which review provider to fetch from",
				options,
				*target,
			)
			if err != nil {
				return err
			}
			*target = value
			return nil
		}
	})
}

func (fb *formBuilder) addRoundField(target *string) {
	fb.addField("round", func() promptStep {
		description := "Leave empty to auto-detect the appropriate round"
		if fb.state.kind == commandKindFetchReviews {
			description = "Leave empty to create the next available review round"
		}
		return numericInput(
			"round",
			"Review Round",
			"auto",
			description,
			target,
			1,
			999,
		)
	})
}

func (fb *formBuilder) addReviewsDirField(target *string) {
	fb.addField("reviews-dir", func() promptStep {
		return func(session promptSession) error {
			value, err := session.input(
				"Reviews Directory (optional)",
				"Leave empty to resolve from PRD name and round",
				".productize/tasks/<name>/reviews-NNN",
				*target,
				nil,
			)
			if err != nil {
				return err
			}
			*target = value
			return nil
		}
	})
}

func (fb *formBuilder) addTasksDirField(target *string) {
	fb.addField("tasks-dir", func() promptStep {
		return func(session promptSession) error {
			value, err := session.input(
				"Tasks Directory (optional)",
				"Leave empty to auto-generate from task name",
				".productize/tasks/<name>",
				*target,
				nil,
			)
			if err != nil {
				return err
			}
			*target = value
			return nil
		}
	})
}

func (fb *formBuilder) addConcurrentField(target *string) {
	fb.addField("concurrent", func() promptStep {
		return numericInput(
			"concurrent",
			"Concurrent Jobs",
			"1",
			"Number of batches to process in parallel (1-10)",
			target,
			1,
			10,
		)
	})
}

func (fb *formBuilder) addBatchSizeField(target *string) {
	fb.addField("batch-size", func() promptStep {
		return numericInput(
			"batch-size",
			"Batch Size",
			"1",
			"Number of file groups per batch (1-50)",
			target,
			1,
			50,
		)
	})
}

func (fb *formBuilder) addIDEField(target *string) {
	fb.addField("ide", func() promptStep {
		options := ideCatalogOptions()
		return func(session promptSession) error {
			value, err := session.selectOne(
				"IDE Tool",
				"Choose which ACP runtime to use (installed directly or available via a supported launcher).",
				options,
				*target,
			)
			if err != nil {
				return err
			}
			*target = value
			return nil
		}
	})
}

func (fb *formBuilder) addModelField(target *string) {
	fb.addField("model", func() promptStep {
		return func(session promptSession) error {
			value, err := session.input(
				"Model (optional)",
				"Model override (defaults: codex/droid=gpt-5.5, "+
					"claude=opus, opencode/pi=anthropic/claude-opus-4-6, gemini=gemini-2.5-pro)",
				"auto",
				*target,
				nil,
			)
			if err != nil {
				return err
			}
			*target = value
			return nil
		}
	})
}

func (fb *formBuilder) addAddDirsField(target *string) {
	fb.addField("add-dir", func() promptStep {
		return func(session promptSession) error {
			value, err := session.input(
				"Additional Directories (optional)",
				"Comma-separated directories to pass via --add-dir for Claude and Codex only; quote paths that contain commas",
				"../shared, ../docs",
				*target,
				nil,
			)
			if err != nil {
				return err
			}
			*target = value
			return nil
		}
	})
}

func (fb *formBuilder) addReasoningEffortField(target *string) {
	fb.addField("reasoning-effort", func() promptStep {
		return func(session promptSession) error {
			value, err := session.selectOne(
				"Reasoning Effort",
				"Model reasoning effort level (applies to Codex, Claude, Droid, OpenCode, and Pi)",
				reasoningPromptOptions(false),
				*target,
			)
			if err != nil {
				return err
			}
			*target = value
			return nil
		}
	})
}

func (fb *formBuilder) addConfirmField(flag, title, description string, target *bool) {
	fb.addField(flag, func() promptStep {
		return func(session promptSession) error {
			value, err := session.confirm(title, description, *target)
			if err != nil {
				return err
			}
			*target = value
			return nil
		}
	})
}

func numericInput(
	_ string,
	title string,
	placeholder string,
	description string,
	target *string,
	minVal int,
	maxVal int,
) promptStep {
	return func(session promptSession) error {
		value, err := session.input(title, description, placeholder, *target, func(str string) error {
			if str == "" {
				return nil
			}
			val, err := strconv.Atoi(str)
			if err != nil {
				return errors.New("must be a number")
			}
			if val < minVal {
				return fmt.Errorf("must be %d or greater", minVal)
			}
			if maxVal > 0 && val > maxVal {
				return fmt.Errorf("must be between %d and %d", minVal, maxVal)
			}
			return nil
		})
		if err != nil {
			return err
		}
		*target = value
		return nil
	}
}

func applyInput[T any, V any](
	cmd *cobra.Command,
	flagName string,
	value V,
	parse func(V) (T, bool),
	setter func(T),
) {
	if cmd.Flags().Lookup(flagName) == nil || cmd.Flags().Changed(flagName) {
		return
	}
	if !inputValueIsExplicit(value) {
		return
	}
	resolved, ok := parse(value)
	if !ok {
		return
	}
	setter(resolved)
	markInputFlagChanged(cmd, flagName)
}

func inputValueIsExplicit[V any](value V) bool {
	switch typed := any(value).(type) {
	case string:
		return strings.TrimSpace(typed) != ""
	case []string:
		return len(core.NormalizeAddDirs(typed)) > 0
	default:
		return true
	}
}

func markInputFlagChanged(cmd *cobra.Command, flagName string) {
	if cmd == nil {
		return
	}
	flags := cmd.Flags()
	if flags == nil {
		return
	}
	flag := flags.Lookup(flagName)
	if flag == nil {
		return
	}
	flag.Changed = true
}

func passThroughInput[T any](value T) (T, bool) {
	return value, true
}

func parseIntInput(value string) (int, bool) {
	if strings.TrimSpace(value) == "" {
		return 0, true
	}
	val, err := strconv.Atoi(value)
	if err != nil {
		return 0, false
	}
	return val, true
}

func parseStringSliceInput(value string) ([]string, bool) {
	return parseAddDirInput(value), true
}

func parseAddDirInput(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}

	reader := csv.NewReader(strings.NewReader(value))
	reader.TrimLeadingSpace = true
	records, err := reader.ReadAll()
	if err == nil {
		var values []string
		for _, record := range records {
			values = append(values, record...)
		}
		return core.NormalizeAddDirs(values)
	}

	return core.NormalizeAddDirs(strings.FieldsFunc(value, func(r rune) bool {
		return r == ',' || r == '\n'
	}))
}

func formatAddDirInput(values []string) string {
	if len(values) == 0 {
		return ""
	}

	formatted := make([]string, 0, len(values))
	for _, value := range values {
		formatted = append(formatted, formatCSVField(value))
	}
	return strings.Join(formatted, ", ")
}

func formatCSVField(value string) string {
	var builder strings.Builder
	writer := csv.NewWriter(&builder)
	if err := writer.Write([]string{value}); err != nil {
		return value
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return value
	}
	return strings.TrimSuffix(builder.String(), "\n")
}

func listTaskSubdirs(baseDir string) []string {
	entries, err := os.ReadDir(baseDir)
	if err != nil {
		return nil
	}
	var dirs []string
	for _, e := range entries {
		if e.IsDir() && model.IsActiveWorkflowDirName(e.Name()) {
			dirs = append(dirs, e.Name())
		}
	}
	sort.Strings(dirs)
	return dirs
}

func ideCatalogOptions() []promptOption {
	entries := agent.DriverCatalog()
	options := make([]promptOption, 0, len(entries))
	for i := range entries {
		entry := &entries[i]
		label := strings.TrimSpace(entry.DisplayName)
		if label == "" {
			label = entry.IDE
		}
		options = append(options, promptOption{Label: label, Value: entry.IDE})
	}
	return options
}

func providerCatalogOptions() []promptOption {
	entries := provider.Catalog(providerdefaults.DefaultRegistry())
	options := make([]promptOption, 0, len(entries))
	for i := range entries {
		entry := &entries[i]
		label := strings.TrimSpace(entry.DisplayName)
		if label == "" {
			label = entry.Name
		}
		options = append(options, promptOption{Label: label, Value: entry.Name})
	}
	return options
}

func reasoningPromptOptions(includeInherit bool) []promptOption {
	options := make([]promptOption, 0, 5)
	if includeInherit {
		options = append(options, promptOption{Label: "Inherit default", Value: ""})
	}
	return append(options,
		promptOption{Label: "Low", Value: "low"},
		promptOption{Label: "Medium", Value: "medium"},
		promptOption{Label: "High", Value: "high"},
		promptOption{Label: "Extra High", Value: "xhigh"},
	)
}

func listTaskRunSubdirs(baseDir string) []string {
	dirs := listTaskSubdirs(baseDir)
	if len(dirs) == 0 {
		return nil
	}

	filtered := make([]string, 0, len(dirs))
	for _, dir := range dirs {
		meta, err := tasks.ReadTaskMeta(filepath.Join(baseDir, dir))
		if err != nil {
			filtered = append(filtered, dir)
			continue
		}
		if meta.Total > 0 && meta.Pending == 0 {
			continue
		}
		filtered = append(filtered, dir)
	}
	if len(filtered) == 0 {
		return nil
	}
	return filtered
}
