package cli

import (
	"fmt"

	"github.com/itseffi/productize/internal/update"
	"github.com/itseffi/productize/internal/version"
	"github.com/spf13/cobra"
)

func newUpgradeCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:          "upgrade",
		Short:        "Upgrade productize to the latest release",
		SilenceUsage: true,
		Args:         cobra.NoArgs,
		Long: `Upgrade productize using the appropriate installation flow for this machine.

Package-manager installs print the correct command to run. Direct binary installs
perform an in-place self-update.`,
		RunE: func(cmd *cobra.Command, _ []string) error {
			ctx, stop := signalCommandContext(cmd)
			defer stop()

			if err := update.Upgrade(ctx, version.Version, cmd.OutOrStdout()); err != nil {
				return fmt.Errorf("upgrade productize: %w", err)
			}
			return nil
		},
	}

	return cmd
}
