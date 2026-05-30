package runshared

import "time"

const (
	ProcessTerminationGracePeriod = 3 * time.Second
	GracefulShutdownTimeout       = 3 * time.Second
)

type ShutdownPhase string

const (
	ShutdownPhaseIdle     ShutdownPhase = ""
	ShutdownPhaseDraining ShutdownPhase = "draining"
	ShutdownPhaseForcing  ShutdownPhase = "forcing"
)

type ShutdownSource string

const (
	ShutdownSourceSignal ShutdownSource = "signal"
	ShutdownSourceTimer  ShutdownSource = "timer"
)

type ShutdownState struct {
	Phase       ShutdownPhase
	Source      ShutdownSource
	RequestedAt time.Time
	DeadlineAt  time.Time
}

func (s ShutdownState) Active() bool {
	return s.Phase != ShutdownPhaseIdle
}
