import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'People HR Management System API',
      version: '1.0.0',
      description: `
        Enterprise-grade HR Management System API with comprehensive features for employee management,
        attendance tracking, leave management, payroll processing, and more.
        
        ## Authentication
        
        This API supports multiple authentication methods:
        - **JWT Bearer Token**: For user authentication (default)
        - **API Keys**: For third-party integrations using X-API-Key header
        - **OAuth 2.0**: For SSO and social login
        
        ## Rate Limiting
        
        API requests are rate-limited based on your authentication method:
        - JWT Auth: 1000 requests per hour
        - API Keys: Configurable per key (default 1000/hour)
        
        ## Webhooks
        
        Subscribe to webhook events to receive real-time notifications about changes in the system.
        All webhook payloads are signed with HMAC-SHA256 for security.
      `,
      contact: {
        name: 'API Support',
        email: 'support@people-hr.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.people-hr.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/v1/auth/login'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for third-party integrations'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE'
            }
          }
        },
        Webhook: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              example: 'Employee Updates Webhook'
            },
            url: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/webhooks/hr'
            },
            events: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['employee.created', 'employee.updated']
            },
            is_active: {
              type: 'boolean',
              example: true
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        ApiKey: {
          type: 'object',
          properties: {
            api_key_id: {
              type: 'string',
              format: 'uuid'
            },
            key_name: {
              type: 'string',
              example: 'Production Integration'
            },
            key_prefix: {
              type: 'string',
              example: 'pk_1234567'
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['read', 'write', 'delete']
              }
            },
            scopes: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['employees', 'attendance']
            },
            rate_limit_per_hour: {
              type: 'integer',
              example: 1000
            },
            is_active: {
              type: 'boolean',
              example: true
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        OAuthProvider: {
          type: 'object',
          properties: {
            provider_id: {
              type: 'string',
              format: 'uuid'
            },
            provider_name: {
              type: 'string',
              enum: ['google', 'microsoft', 'github', 'linkedin'],
              example: 'google'
            },
            is_active: {
              type: 'boolean',
              example: true
            },
            scopes: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['openid', 'profile', 'email']
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Employees',
        description: 'Employee management operations'
      },
      {
        name: 'Attendance',
        description: 'Attendance tracking and management'
      },
      {
        name: 'Leave',
        description: 'Leave requests and approvals'
      },
      {
        name: 'Webhooks',
        description: 'Webhook management for event notifications'
      },
      {
        name: 'OAuth',
        description: 'OAuth 2.0 authentication and SSO'
      },
      {
        name: 'API Keys',
        description: 'API key management for third-party integrations'
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
