
#!/usr/bin/env python3
"""
Generate OpenAPI documentation for PAM backend API.
"""

import sys
import os
import json
from datetime import datetime
from typing import Dict, Any

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.logging import get_logger

logger = get_logger(__name__)

class APIDocGenerator:
    def __init__(self):
        self.openapi_spec = {
            "openapi": "3.0.0",
            "info": {
                "title": "PAM Backend API",
                "version": "1.0.0",
                "description": "Personal AI Manager for Grey Nomads - Backend API",
                "contact": {
                    "name": "PAM Development Team",
                    "email": "support@wheelsandwins.com"
                }
            },
            "servers": [
                {
                    "url": "https://api.wheelsandwins.com",
                    "description": "Production server"
                },
                {
                    "url": "http://localhost:8000",
                    "description": "Development server"
                }
            ],
            "paths": {},
            "components": {
                "schemas": {},
                "securitySchemes": {
                    "BearerAuth": {
                        "type": "http",
                        "scheme": "bearer",
                        "bearerFormat": "JWT"
                    }
                }
            },
            "security": [
                {
                    "BearerAuth": []
                }
            ]
        }
    
    def add_schemas(self):
        """Add common schemas to the API specification"""
        schemas = {
            "User": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "format": "uuid"},
                    "email": {"type": "string", "format": "email"},
                    "full_name": {"type": "string"},
                    "region": {"type": "string"},
                    "preferences": {"type": "object"},
                    "created_at": {"type": "string", "format": "date-time"},
                    "updated_at": {"type": "string", "format": "date-time"}
                }
            },
            "Expense": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "user_id": {"type": "string", "format": "uuid"},
                    "amount": {"type": "number", "format": "decimal"},
                    "category": {"type": "string"},
                    "description": {"type": "string"},
                    "date": {"type": "string", "format": "date"},
                    "created_at": {"type": "string", "format": "date-time"}
                }
            },
            "MaintenanceRecord": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "user_id": {"type": "string", "format": "uuid"},
                    "task": {"type": "string"},
                    "date": {"type": "string", "format": "date"},
                    "mileage": {"type": "integer"},
                    "cost": {"type": "number", "format": "decimal"},
                    "status": {"type": "string", "enum": ["completed", "due", "overdue"]},
                    "notes": {"type": "string"},
                    "next_due_date": {"type": "string", "format": "date"},
                    "next_due_mileage": {"type": "integer"}
                }
            },
            "ChatMessage": {
                "type": "object",
                "properties": {
                    "message": {"type": "string"},
                    "user_id": {"type": "string", "format": "uuid"},
                    "session_id": {"type": "string", "format": "uuid"}
                },
                "required": ["message", "user_id"]
            },
            "ChatResponse": {
                "type": "object",
                "properties": {
                    "response": {"type": "string"},
                    "intent": {"type": "string"},
                    "confidence": {"type": "number"},
                    "context_used": {"type": "object"},
                    "node_used": {"type": "string"}
                }
            },
            "CampingLocation": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "format": "uuid"},
                    "name": {"type": "string"},
                    "type": {"type": "string"},
                    "latitude": {"type": "number"},
                    "longitude": {"type": "number"},
                    "address": {"type": "string"},
                    "amenities": {"type": "object"},
                    "price_per_night": {"type": "number", "format": "decimal"},
                    "reservation_required": {"type": "boolean"}
                }
            },
            "HustleIdea": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "format": "uuid"},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "status": {"type": "string"},
                    "avg_earnings": {"type": "number", "format": "decimal"},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "user_id": {"type": "string", "format": "uuid"}
                }
            },
            "Error": {
                "type": "object",
                "properties": {
                    "error": {"type": "string"},
                    "message": {"type": "string"},
                    "code": {"type": "integer"}
                }
            }
        }
        
        self.openapi_spec["components"]["schemas"].update(schemas)
    
    def add_chat_endpoints(self):
        """Add chat/PAM endpoints"""
        chat_paths = {
            "/api/v1/chat": {
                "post": {
                    "summary": "Send message to PAM",
                    "description": "Send a message to the PAM AI assistant",
                    "tags": ["Chat"],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ChatMessage"}
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Successful response from PAM",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/ChatResponse"}
                                }
                            }
                        },
                        "422": {
                            "description": "Validation error",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Error"}
                                }
                            }
                        }
                    }
                }
            },
            "/api/v1/chat/history/{user_id}": {
                "get": {
                    "summary": "Get conversation history",
                    "description": "Retrieve conversation history for a user",
                    "tags": ["Chat"],
                    "parameters": [
                        {
                            "name": "user_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string", "format": "uuid"},
                            "description": "User ID"
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Conversation history retrieved",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "conversations": {
                                                "type": "array",
                                                "items": {"type": "object"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/v1/chat/session": {
                "post": {
                    "summary": "Create chat session",
                    "description": "Create a new chat session for a user",
                    "tags": ["Chat"],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "user_id": {"type": "string", "format": "uuid"}
                                    },
                                    "required": ["user_id"]
                                }
                            }
                        }
                    },
                    "responses": {
                        "201": {
                            "description": "Session created successfully",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "session_id": {"type": "string", "format": "uuid"},
                                            "created_at": {"type": "string", "format": "date-time"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        self.openapi_spec["paths"].update(chat_paths)
    
    def add_wheels_endpoints(self):
        """Add wheels (travel) endpoints"""
        wheels_paths = {
            "/api/v1/wheels/maintenance/{user_id}": {
                "get": {
                    "summary": "Get maintenance records",
                    "description": "Retrieve maintenance records for a user",
                    "tags": ["Wheels"],
                    "parameters": [
                        {
                            "name": "user_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string", "format": "uuid"}
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Maintenance records retrieved",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "maintenance_records": {
                                                "type": "array",
                                                "items": {"$ref": "#/components/schemas/MaintenanceRecord"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/v1/wheels/maintenance": {
                "post": {
                    "summary": "Create maintenance record",
                    "description": "Create a new maintenance record",
                    "tags": ["Wheels"],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/MaintenanceRecord"}
                            }
                        }
                    },
                    "responses": {
                        "201": {
                            "description": "Maintenance record created",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/MaintenanceRecord"}
                                }
                            }
                        }
                    }
                }
            },
            "/api/v1/wheels/fuel/{user_id}": {
                "get": {
                    "summary": "Get fuel logs",
                    "description": "Retrieve fuel logs for a user",
                    "tags": ["Wheels"],
                    "parameters": [
                        {
                            "name": "user_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string", "format": "uuid"}
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Fuel logs retrieved",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "fuel_logs": {
                                                "type": "array",
                                                "items": {"type": "object"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/v1/wheels/camping": {
                "get": {
                    "summary": "Get camping locations",
                    "description": "Retrieve available camping locations",
                    "tags": ["Wheels"],
                    "responses": {
                        "200": {
                            "description": "Camping locations retrieved",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "locations": {
                                                "type": "array",
                                                "items": {"$ref": "#/components/schemas/CampingLocation"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        self.openapi_spec["paths"].update(wheels_paths)
    
    def add_wins_endpoints(self):
        """Add wins (money-making) endpoints"""
        wins_paths = {
            "/api/v1/wins/hustles": {
                "get": {
                    "summary": "Get hustle ideas",
                    "description": "Retrieve available hustle ideas",
                    "tags": ["Wins"],
                    "responses": {
                        "200": {
                            "description": "Hustle ideas retrieved",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "hustles": {
                                                "type": "array",
                                                "items": {"$ref": "#/components/schemas/HustleIdea"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "post": {
                    "summary": "Create hustle idea",
                    "description": "Submit a new hustle idea",
                    "tags": ["Wins"],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/HustleIdea"}
                            }
                        }
                    },
                    "responses": {
                        "201": {
                            "description": "Hustle idea created",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/HustleIdea"}
                                }
                            }
                        }
                    }
                }
            },
            "/api/v1/wins/expenses": {
                "get": {
                    "summary": "Get expenses",
                    "description": "Retrieve user expenses",
                    "tags": ["Wins"],
                    "parameters": [
                        {
                            "name": "user_id",
                            "in": "query",
                            "required": True,
                            "schema": {"type": "string", "format": "uuid"}
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "Expenses retrieved",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "expenses": {
                                                "type": "array",
                                                "items": {"$ref": "#/components/schemas/Expense"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "post": {
                    "summary": "Create expense",
                    "description": "Add a new expense record",
                    "tags": ["Wins"],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/Expense"}
                            }
                        }
                    },
                    "responses": {
                        "201": {
                            "description": "Expense created",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Expense"}
                                }
                            }
                        }
                    }
                }
            }
        }
        
        self.openapi_spec["paths"].update(wins_paths)
    
    def add_health_endpoints(self):
        """Add health check endpoints"""
        health_paths = {
            "/health": {
                "get": {
                    "summary": "Health check",
                    "description": "Check API health status",
                    "tags": ["Health"],
                    "responses": {
                        "200": {
                            "description": "API is healthy",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "status": {"type": "string"},
                                            "timestamp": {"type": "string", "format": "date-time"},
                                            "version": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        self.openapi_spec["paths"].update(health_paths)
    
    def generate_documentation(self):
        """Generate complete API documentation"""
        logger.info("Generating OpenAPI documentation...")
        
        # Add all components
        self.add_schemas()
        self.add_chat_endpoints()
        self.add_wheels_endpoints()
        self.add_wins_endpoints()
        self.add_health_endpoints()
        
        # Add generation metadata
        self.openapi_spec["info"]["x-generated"] = {
            "timestamp": datetime.now().isoformat(),
            "generator": "PAM API Documentation Generator"
        }
        
        # Save OpenAPI spec
        openapi_file = "openapi.json"
        with open(openapi_file, 'w') as f:
            json.dump(self.openapi_spec, f, indent=2)
        
        logger.info(f"📁 OpenAPI specification saved to: {openapi_file}")
        
        # Generate HTML documentation
        self.generate_html_docs()
        
        return self.openapi_spec
    
    def generate_html_docs(self):
        """Generate HTML documentation using Swagger UI"""
        html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PAM Backend API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: './openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
            });
        };
    </script>
</body>
</html>
"""
        
        html_file = "api_docs.html"
        with open(html_file, 'w') as f:
            f.write(html_template)
        
        logger.info(f"📁 HTML documentation saved to: {html_file}")
        logger.info("   Open this file in a web browser to view the interactive docs")

def main():
    """Main function to generate API documentation"""
    generator = APIDocGenerator()
    openapi_spec = generator.generate_documentation()
    
    logger.info("\n📚 API Documentation Generation Complete!")
    logger.info(f"Endpoints documented: {len(openapi_spec['paths'])}")
    logger.info(f"Schemas defined: {len(openapi_spec['components']['schemas'])}")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
