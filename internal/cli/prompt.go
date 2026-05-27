package cli

import (
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/spf13/cobra"
)

type promptOption struct {
	Label string
	Value string
}

const (
	promptBoolTrue  = "true"
	promptBoolFalse = "false"
)

type promptSession struct {
	in  io.Reader
	out io.Writer
}

func newPromptSession(cmd *cobra.Command) promptSession {
	in := io.Reader(nil)
	out := io.Writer(nil)
	if cmd != nil {
		in = cmd.InOrStdin()
		out = cmd.OutOrStdout()
	}
	if in == nil {
		in = strings.NewReader("")
	}
	if out == nil {
		out = io.Discard
	}
	return promptSession{in: in, out: out}
}

func (p promptSession) input(
	title, description, placeholder, current string,
	validate func(string) error,
) (string, error) {
	if err := p.writePromptHeader(title, description); err != nil {
		return "", err
	}
	label := "value"
	if placeholder != "" {
		label = placeholder
	}
	if current != "" {
		if _, err := fmt.Fprintf(p.out, "%s [%s]: ", label, current); err != nil {
			return "", err
		}
	} else if _, err := fmt.Fprintf(p.out, "%s: ", label); err != nil {
		return "", err
	}
	value, err := readPromptLine(p.in)
	if err != nil {
		return "", err
	}
	value = strings.TrimSpace(value)
	if value == "" {
		value = current
	}
	if validate != nil {
		if err := validate(value); err != nil {
			return "", err
		}
	}
	return value, nil
}

func (p promptSession) confirm(title, description string, current bool) (bool, error) {
	if err := p.writePromptHeader(title, description); err != nil {
		return false, err
	}
	defaultLabel := "y/N"
	if current {
		defaultLabel = "Y/n"
	}
	if _, err := fmt.Fprintf(p.out, "Confirm [%s]: ", defaultLabel); err != nil {
		return false, err
	}
	value, err := readPromptLine(p.in)
	if err != nil {
		return false, err
	}
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "":
		return current, nil
	case "y", "yes", promptBoolTrue, "1":
		return true, nil
	case "n", "no", promptBoolFalse, "0":
		return false, nil
	default:
		return false, fmt.Errorf("expected yes or no, got %q", strings.TrimSpace(value))
	}
}

func (p promptSession) selectOne(title, description string, options []promptOption, current string) (string, error) {
	if len(options) == 0 {
		return current, nil
	}
	if err := p.writePromptHeader(title, description); err != nil {
		return "", err
	}
	defaultIndex := optionIndex(options, current)
	for i, option := range options {
		marker := " "
		if i == defaultIndex {
			marker = "*"
		}
		if _, err := fmt.Fprintf(p.out, "  %s %d. %s\n", marker, i+1, option.Label); err != nil {
			return "", err
		}
	}
	if _, err := fmt.Fprint(p.out, "Selection: "); err != nil {
		return "", err
	}
	line, err := readPromptLine(p.in)
	if err != nil {
		return "", err
	}
	line = strings.TrimSpace(line)
	if line == "" && defaultIndex >= 0 {
		return options[defaultIndex].Value, nil
	}
	selected, err := parsePromptOptionSelection(options, line)
	if err != nil {
		return "", err
	}
	return selected.Value, nil
}

func (p promptSession) selectMany(
	title, description string,
	options []promptOption,
	current []string,
) ([]string, error) {
	if len(options) == 0 {
		return nil, nil
	}
	currentSet := make(map[string]struct{}, len(current))
	for _, value := range current {
		currentSet[strings.TrimSpace(value)] = struct{}{}
	}
	if err := p.writePromptHeader(title, description); err != nil {
		return nil, err
	}
	for i, option := range options {
		marker := " "
		if _, ok := currentSet[option.Value]; ok {
			marker = "*"
		}
		if _, err := fmt.Fprintf(p.out, "  %s %d. %s\n", marker, i+1, option.Label); err != nil {
			return nil, err
		}
	}
	if _, err := fmt.Fprint(p.out, "Selections (comma-separated, blank keeps defaults): "); err != nil {
		return nil, err
	}
	line, err := readPromptLine(p.in)
	if err != nil {
		return nil, err
	}
	line = strings.TrimSpace(line)
	if line == "" {
		return append([]string(nil), current...), nil
	}
	parts := strings.Split(line, ",")
	values := make([]string, 0, len(parts))
	seen := make(map[string]struct{}, len(parts))
	for _, part := range parts {
		option, err := parsePromptOptionSelection(options, strings.TrimSpace(part))
		if err != nil {
			return nil, err
		}
		if _, ok := seen[option.Value]; ok {
			continue
		}
		seen[option.Value] = struct{}{}
		values = append(values, option.Value)
	}
	return values, nil
}

func (p promptSession) writePromptHeader(title, description string) error {
	title = strings.TrimSpace(title)
	description = strings.TrimSpace(description)
	if title != "" {
		if _, err := fmt.Fprintln(p.out, title); err != nil {
			return err
		}
	}
	if description != "" {
		if _, err := fmt.Fprintln(p.out, description); err != nil {
			return err
		}
	}
	return nil
}

func optionIndex(options []promptOption, value string) int {
	value = strings.TrimSpace(value)
	for i, option := range options {
		if strings.TrimSpace(option.Value) == value {
			return i
		}
	}
	return -1
}

func parsePromptOptionSelection(options []promptOption, raw string) (promptOption, error) {
	if raw == "" {
		return promptOption{}, errors.New("selection is required")
	}
	if index, err := strconv.Atoi(raw); err == nil {
		if index < 1 || index > len(options) {
			return promptOption{}, fmt.Errorf("selection %d is out of range", index)
		}
		return options[index-1], nil
	}
	for _, option := range options {
		if strings.EqualFold(raw, option.Value) || strings.EqualFold(raw, option.Label) {
			return option, nil
		}
	}
	return promptOption{}, fmt.Errorf("unknown selection %q", raw)
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
