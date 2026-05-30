package udsapi

import (
	"github.com/gin-gonic/gin"

	"github.com/itseffi/productize/internal/api/core"
)

// RegisterRoutes registers the shared daemon API routes on the supplied router.
func RegisterRoutes(router gin.IRouter, handlers *core.Handlers) {
	core.RegisterRoutes(router, handlers)
}
