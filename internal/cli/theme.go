package cli

type cliChromeStyles struct {
	box            textStyle
	title          textStyle
	subtitle       textStyle
	sectionTitle   textStyle
	label          textStyle
	value          textStyle
	separator      textStyle
	skill          textStyle
	arrow          textStyle
	agent          textStyle
	path           textStyle
	warn           textStyle
	successHeader  textStyle
	successIcon    textStyle
	failureHeader  textStyle
	failureIcon    textStyle
	errorMessage   textStyle
	formIntro      textStyle
	formSuccess    textStyle
	formSuccessSub textStyle
}

type textStyle struct{}

func (textStyle) Render(value string) string {
	return value
}

func newCLIChromeStyles() cliChromeStyles {
	style := textStyle{}
	return cliChromeStyles{
		box:            style,
		title:          style,
		subtitle:       style,
		sectionTitle:   style,
		label:          style,
		value:          style,
		separator:      style,
		skill:          style,
		arrow:          style,
		agent:          style,
		path:           style,
		warn:           style,
		successHeader:  style,
		successIcon:    style,
		failureHeader:  style,
		failureIcon:    style,
		errorMessage:   style,
		formIntro:      style,
		formSuccess:    style,
		formSuccessSub: style,
	}
}

func renderFormIntro() string {
	styles := newCLIChromeStyles()
	return styles.formIntro.Render(
		"PRODUCTIZE // INTERACTIVE INPUT",
	) + "\n" + styles.subtitle.Render(
		"Collect parameters for this run",
	)
}

func renderFormSuccess() string {
	styles := newCLIChromeStyles()
	return styles.formSuccess.Render(
		"OK PARAMETERS COLLECTED",
	) + "\n" + styles.formSuccessSub.Render(
		"Flags are ready to be applied",
	)
}
