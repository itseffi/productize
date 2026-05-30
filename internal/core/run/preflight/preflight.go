package preflight

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strings"

	"github.com/itseffi/productize/internal/core/tasks"
)

type Decision string

const (
	OK        Decision = "ok"
	Continued Decision = "continued"
	Aborted   Decision = "aborted"
	Skipped   Decision = "skipped"
	Forced    Decision = "forced"
)

type Config struct {
	TasksDir       string
	Registry       *tasks.TypeRegistry
	IsInteractive  func() bool
	Force          bool
	SkipValidation bool
	Stderr         io.Writer
	FormInput      io.Reader
	FormOutput     io.Writer
	ClipboardWrite func(string) error
	Logger         *slog.Logger
	ValidationFn   func(context.Context, string, *tasks.TypeRegistry) (tasks.Report, error)
	ValidationForm func(tasks.Report, *tasks.TypeRegistry, io.Writer) (Decision, error)
}

func Check(
	ctx context.Context,
	tasksDir string,
	registry *tasks.TypeRegistry,
	isInteractive func() bool,
	force bool,
) (Decision, error) {
	return CheckConfig(ctx, Config{
		TasksDir:      tasksDir,
		Registry:      registry,
		IsInteractive: isInteractive,
		Force:         force,
	})
}

func CheckConfig(ctx context.Context, cfg Config) (Decision, error) {
	if cfg.SkipValidation {
		logPreflightDecision(cfg.Logger, Skipped, "", tasks.Report{})
		return Skipped, nil
	}

	validate := cfg.ValidationFn
	if validate == nil {
		validate = tasks.Validate
	}
	form := cfg.ValidationForm
	report, err := validate(ctx, cfg.TasksDir, cfg.Registry)
	if err != nil {
		return "", fmt.Errorf("run task metadata validation: %w", err)
	}
	if report.OK() {
		logPreflightDecision(cfg.Logger, OK, report.TasksDir, report)
		return OK, nil
	}
	if cfg.Force {
		logPreflightDecision(cfg.Logger, Forced, report.TasksDir, report)
		return Forced, nil
	}
	if isInteractive(cfg.IsInteractive) {
		var decision Decision
		if form == nil {
			decision, err = runValidationFormWithIO(
				report,
				cfg.Registry,
				resolvePreflightStderr(cfg.Stderr),
				cfg.FormInput,
				cfg.FormOutput,
				cfg.ClipboardWrite,
			)
		} else {
			decision, err = form(report, cfg.Registry, resolvePreflightStderr(cfg.Stderr))
		}
		if err != nil {
			return "", err
		}
		logPreflightDecision(cfg.Logger, decision, report.TasksDir, report)
		return decision, nil
	}
	if err := writePreflightFailure(resolvePreflightStderr(cfg.Stderr), report, cfg.Registry); err != nil {
		return "", err
	}
	logPreflightDecision(cfg.Logger, Aborted, report.TasksDir, report)
	return Aborted, nil
}

func runValidationFormWithIO(
	report tasks.Report,
	registry *tasks.TypeRegistry,
	stderr io.Writer,
	input io.Reader,
	output io.Writer,
	clipboardWrite func(string) error,
) (Decision, error) {
	promptOutput := output
	if promptOutput == nil {
		promptOutput = stderr
	}
	if err := writePreflightIssueSummary(stderr, report); err != nil {
		return "", err
	}
	if _, err := fmt.Fprint(
		promptOutput,
		"\nContinue despite validation issues? [y/N, p=copy fix prompt]: ",
	); err != nil {
		return "", fmt.Errorf("write validation prompt: %w", err)
	}
	answer, err := readPromptLine(resolveValidationFormInput(input))
	if err != nil {
		return "", fmt.Errorf("read validation prompt: %w", err)
	}
	switch strings.ToLower(strings.TrimSpace(answer)) {
	case "y", "yes", "c", "continue":
		return Continued, nil
	case "p", "prompt", "copy":
		prompt := tasks.FixPrompt(report, registry)
		if strings.TrimSpace(prompt) == "" {
			return Aborted, nil
		}
		if clipboardWrite != nil {
			if err := clipboardWrite(prompt); err != nil {
				if _, writeErr := fmt.Fprintf(
					stderr,
					"Unable to copy fix prompt to clipboard: %v\n\nFix prompt:\n%s\n",
					err,
					prompt,
				); writeErr != nil {
					return "", fmt.Errorf("write fallback fix prompt: %w", writeErr)
				}
				return Aborted, nil
			}
			if _, err := fmt.Fprintln(stderr, "Fix prompt copied to clipboard."); err != nil {
				return "", fmt.Errorf("write clipboard confirmation: %w", err)
			}
			return Aborted, nil
		}
		if _, err := fmt.Fprintln(stderr, prompt); err != nil {
			return "", fmt.Errorf("write fix prompt: %w", err)
		}
		return Aborted, nil
	default:
		return Aborted, nil
	}
}

func resolveValidationFormInput(input io.Reader) io.Reader {
	if input != nil {
		return input
	}
	return os.Stdin
}

func readPromptLine(r io.Reader) (string, error) {
	if r == nil {
		return "", io.EOF
	}
	var builder strings.Builder
	var buf [1]byte
	for {
		n, err := r.Read(buf[:])
		if n > 0 {
			switch buf[0] {
			case '\n':
				return builder.String(), nil
			case '\r':
				continue
			default:
				if err := builder.WriteByte(buf[0]); err != nil {
					return "", err
				}
			}
		}
		if err != nil {
			if errors.Is(err, io.EOF) && builder.Len() > 0 {
				return builder.String(), nil
			}
			return "", err
		}
	}
}

func writePreflightFailure(stderr io.Writer, report tasks.Report, registry *tasks.TypeRegistry) error {
	if stderr == nil {
		return nil
	}

	if _, err := fmt.Fprintf(
		stderr,
		"task validation failed: %d issue(s) across %d file(s)\n",
		len(report.Issues),
		distinctValidationIssuePaths(report.Issues),
	); err != nil {
		return fmt.Errorf("write preflight summary: %w", err)
	}

	currentPath := ""
	for _, issue := range report.Issues {
		if issue.Path != currentPath {
			currentPath = issue.Path
			if _, err := fmt.Fprintf(stderr, "\n%s\n", currentPath); err != nil {
				return fmt.Errorf("write preflight issue path: %w", err)
			}
		}
		if _, err := fmt.Fprintf(stderr, "- %s: %s\n", issue.Field, issue.Message); err != nil {
			return fmt.Errorf("write preflight issue: %w", err)
		}
	}

	prompt := tasks.FixPrompt(report, registry)
	if strings.TrimSpace(prompt) == "" {
		return nil
	}
	if _, err := fmt.Fprintf(stderr, "\nFix prompt:\n%s\n", prompt); err != nil {
		return fmt.Errorf("write preflight fix prompt: %w", err)
	}
	return nil
}

func writePreflightIssueSummary(stderr io.Writer, report tasks.Report) error {
	if stderr == nil {
		return nil
	}
	if _, err := fmt.Fprintf(
		stderr,
		"task validation failed: %d issue(s) across %d file(s)\n",
		len(report.Issues),
		distinctValidationIssuePaths(report.Issues),
	); err != nil {
		return fmt.Errorf("write preflight summary: %w", err)
	}

	currentPath := ""
	for _, issue := range report.Issues {
		if issue.Path != currentPath {
			currentPath = issue.Path
			if _, err := fmt.Fprintf(stderr, "\n%s\n", currentPath); err != nil {
				return fmt.Errorf("write preflight issue path: %w", err)
			}
		}
		if _, err := fmt.Fprintf(stderr, "- %s: %s\n", issue.Field, issue.Message); err != nil {
			return fmt.Errorf("write preflight issue: %w", err)
		}
	}
	return nil
}

func distinctValidationIssuePaths(issues []tasks.Issue) int {
	paths := make(map[string]struct{}, len(issues))
	for _, issue := range issues {
		paths[issue.Path] = struct{}{}
	}
	return len(paths)
}

func logPreflightDecision(logger *slog.Logger, decision Decision, tasksDir string, report tasks.Report) {
	if logger == nil {
		return
	}
	logger.Info(
		"task metadata preflight",
		"preflight",
		string(decision),
		"tasks_dir",
		tasksDir,
		"issues",
		len(report.Issues),
		"scanned",
		report.Scanned,
	)
}

func resolvePreflightStderr(stderr io.Writer) io.Writer {
	if stderr != nil {
		return stderr
	}
	return os.Stderr
}

func isInteractive(fn func() bool) bool {
	if fn == nil {
		return false
	}
	return fn()
}
