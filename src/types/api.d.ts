export default {
    "openapi": "3.0.0",
    "info": {
        "title": "Melody Track API",
        "version": "v2"
    },
    "servers": [
        {
            "url": "http://localhost:5230"
        },
        {
            "url": "https://mt.dadyarri.ru/api",
        }
    ],
    "paths": {
        "/auth/forgotPassword": {
            "post": {
                "tags": [
                    "Auth"
                ],
                "operationId": "MelodyTrackBackendApiAuthEndpointsForgotPasswordEndpoint",
                "requestBody": {
                    "x-name": "ForgotPasswordRequest",
                    "description": "",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/MelodyTrackBackendApiAuthRequestsForgotPasswordRequest"
                            }
                        }
                    },
                    "required": true,
                    "x-position": 1
                },
                "responses": {
                    "204": {
                        "description": "No Content"
                    }
                }
            }
        },
        "/auth/sessions": {
            "get": {
                "tags": [
                    "Auth"
                ],
                "operationId": "MelodyTrackBackendApiAuthEndpointsGetSessionsEndpoint",
                "responses": {
                    "200": {
                        "description": "Success",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/MelodyTrackBackendApiAuthResponsesGetSessionsResponse"
                                }
                            }
                        }
                    },
                    "401": {
                        "description": "Unauthorized"
                    }
                },
                "security": [
                    {
                        "JWTBearerAuth": []
                    }
                ]
            }
        },
        "/auth/login": {
            "post": {
                "tags": [
                    "Auth"
                ],
                "operationId": "MelodyTrackBackendApiAuthEndpointsLoginEndpoint",
                "requestBody": {
                    "x-name": "LoginRequest",
                    "description": "",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/MelodyTrackBackendApiAuthRequestsLoginRequest"
                            }
                        }
                    },
                    "required": true,
                    "x-position": 1
                },
                "responses": {
                    "200": {
                        "description": "Success",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/MelodyTrackBackendApiAuthResponsesLoginResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/auth/logoutAll": {
            "post": {
                "tags": [
                    "Auth"
                ],
                "operationId": "MelodyTrackBackendApiAuthEndpointsLogoutAllEndpoint",
                "responses": {
                    "204": {
                        "description": "No Content"
                    },
                    "401": {
                        "description": "Unauthorized"
                    }
                },
                "security": [
                    {
                        "JWTBearerAuth": []
                    }
                ]
            }
        },
        "/auth/logout": {
            "post": {
                "tags": [
                    "Auth"
                ],
                "operationId": "MelodyTrackBackendApiAuthEndpointsLogoutEndpoint",
                "requestBody": {
                    "x-name": "LogoutRequest",
                    "description": "",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/MelodyTrackBackendApiAuthRequestsLogoutRequest"
                            }
                        }
                    },
                    "required": true,
                    "x-position": 1
                },
                "responses": {
                    "204": {
                        "description": "No Content"
                    },
                    "401": {
                        "description": "Unauthorized"
                    }
                },
                "security": [
                    {
                        "JWTBearerAuth": []
                    }
                ]
            }
        },
        "/auth/2fa/recover": {
            "post": {
                "tags": [
                    "Auth"
                ],
                "operationId": "MelodyTrackBackendApiAuthEndpointsRecover2FaEndpoint",
                "requestBody": {
                    "x-name": "Recover2FaRequest",
                    "description": "",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/MelodyTrackBackendApiAuthRequestsRecover2FaRequest"
                            }
                        }
                    },
                    "required": true,
                    "x-position": 1
                },
                "responses": {
                    "200": {
                        "description": "Success",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/MelodyTrackBackendApiAuthResponsesRecover2FaResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/auth/recoveryCodes": {
            "post": {
                "tags": [
                    "Auth"
                ],
                "operationId": "MelodyTrackBackendApiAuthEndpointsRecoveryCodesEndpoint",
                "responses": {
                    "200": {
                        "description": "Success",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/MelodyTrackBackendApiAuthResponsesRecoveryCodesResponse"
                                }
                            }
                        }
                    },
                    "401": {
                        "description": "Unauthorized"
                    }
                },
                "security": [
                    {
                        "JWTBearerAuth": []
                    }
                ]
            }
        },
        "/auth/refresh": {
            "post": {
                "tags": [
                    "Auth"
                ],
                "operationId": "MelodyTrackBackendApiAuthEndpointsRefreshEndpoint",
                "requestBody": {
                    "x-name": "RefreshRequest",
                    "description": "",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/MelodyTrackBackendApiAuthRequestsRefreshRequest"
                            }
                        }
                    },
                    "required": true,
                    "x-position": 1
                },
                "responses": {
                    "200": {
                        "description": "Success",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/MelodyTrackBackendApiAuthResponsesLoginResponse"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/auth/register": {
            "post": {
                "tags": [
                    "Auth"
                ],
                "operationId": "MelodyTrackBackendApiAuthEndpointsRegisterEndpoint",
                "requestBody": {
                    "x-name": "RegisterRequest",
                    "description": "",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/MelodyTrackBackendApiAuthRequestsRegisterRequest"
                            }
                        }
                    },
                    "required": true,
                    "x-position": 1
                },
                "responses": {
                    "201": {
                        "description": "Created",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/MelodyTrackBackendApiAuthResponsesRegisterResponse"
                                }
                            }
                        }
                    },
                    "400": {
                        "description": "Bad Request",
                        "content": {
                            "application/problem+json": {
                                "schema": {
                                    "$ref": "#/components/schemas/FastEndpointsProblemDetails"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/auth/2fa/delete": {
            "delete": {
                "tags": [
                    "Auth"
                ],
                "operationId": "MelodyTrackBackendApiAuthEndpointsRemove2FaEndpoint",
                "responses": {
                    "204": {
                        "description": "No Content"
                    },
                    "401": {
                        "description": "Unauthorized"
                    }
                },
                "security": [
                    {
                        "JWTBearerAuth": []
                    }
                ]
            }
        },
        "/auth/resetPassword": {
            "post": {
                "tags": [
                    "Auth"
                ],
                "operationId": "MelodyTrackBackendApiAuthEndpointsResetPasswordEndpoint",
                "requestBody": {
                    "x-name": "ResetPasswordRequest",
                    "description": "",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/MelodyTrackBackendApiAuthRequestsResetPasswordRequest"
                            }
                        }
                    },
                    "required": true,
                    "x-position": 1
                },
                "responses": {
                    "204": {
                        "description": "No Content"
                    }
                }
            }
        },
        "/auth/2fa/setup": {
            "post": {
                "tags": [
                    "Auth"
                ],
                "operationId": "MelodyTrackBackendApiAuthEndpointsSetup2FaEndpoint",
                "requestBody": {
                    "x-name": "Setup2FaRequest",
                    "description": "",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/MelodyTrackBackendApiAuthRequestsSetup2FaRequest"
                            }
                        }
                    },
                    "required": true,
                    "x-position": 1
                },
                "responses": {
                    "200": {
                        "description": "Success",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/MelodyTrackBackendApiAuthResponsesSetup2FaResponse"
                                }
                            }
                        }
                    },
                    "401": {
                        "description": "Unauthorized"
                    }
                },
                "security": [
                    {
                        "JWTBearerAuth": []
                    }
                ]
            }
        },
        "/auth/2fa/verify": {
            "post": {
                "tags": [
                    "Auth"
                ],
                "operationId": "MelodyTrackBackendApiAuthEndpointsVerify2FaEndpoint",
                "requestBody": {
                    "x-name": "Verify2FaRequest",
                    "description": "",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/MelodyTrackBackendApiAuthRequestsVerify2FaRequest"
                            }
                        }
                    },
                    "required": true,
                    "x-position": 1
                },
                "responses": {
                    "204": {
                        "description": "No Content"
                    }
                }
            }
        }
    },
    "components": {
        "schemas": {
            "MelodyTrackBackendApiAuthRequestsForgotPasswordRequest": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "email": {
                        "type": "string"
                    }
                }
            },
            "MelodyTrackBackendApiAuthResponsesGetSessionsResponse": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "data": {
                        "type": "array",
                        "items": {
                            "$ref": "#/components/schemas/MelodyTrackBackendApiAuthResponsesSessionDto"
                        }
                    }
                }
            },
            "MelodyTrackBackendApiAuthResponsesSessionDto": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "id": {
                        "type": "string"
                    },
                    "deviceInfo": {
                        "type": "string"
                    }
                }
            },
            "MelodyTrackBackendApiAuthResponsesLoginResponse": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "accessToken": {
                        "type": "string"
                    },
                    "refreshToken": {
                        "type": "string"
                    },
                    "firstName": {
                        "type": "string"
                    },
                    "lastName": {
                        "type": "string"
                    }
                }
            },
            "MelodyTrackBackendApiAuthRequestsLoginRequest": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "email": {
                        "type": "string"
                    },
                    "password": {
                        "type": "string"
                    },
                    "otp": {
                        "type": "string",
                        "nullable": true
                    }
                }
            },
            "MelodyTrackBackendApiAuthRequestsLogoutRequest": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "refreshToken": {
                        "type": "string"
                    }
                }
            },
            "MelodyTrackBackendApiAuthResponsesRecover2FaResponse": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "accessToken": {
                        "type": "string"
                    },
                    "refreshToken": {
                        "type": "string"
                    },
                    "secret": {
                        "type": "string"
                    },
                    "otpUrl": {
                        "type": "string"
                    }
                }
            },
            "MelodyTrackBackendApiAuthRequestsRecover2FaRequest": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "email": {
                        "type": "string"
                    },
                    "recoveryCode": {
                        "type": "string"
                    }
                }
            },
            "MelodyTrackBackendApiAuthResponsesRecoveryCodesResponse": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "codes": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    }
                }
            },
            "MelodyTrackBackendApiAuthRequestsRefreshRequest": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "refreshToken": {
                        "type": "string"
                    }
                }
            },
            "MelodyTrackBackendApiAuthResponsesRegisterResponse": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "totpRequired": {
                        "type": "boolean"
                    },
                    "secret": {
                        "type": "string",
                        "nullable": true
                    },
                    "otpUrl": {
                        "type": "string",
                        "nullable": true
                    }
                }
            },
            "MelodyTrackBackendApiAuthRequestsRegisterRequest": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                    "email",
                    "password"
                ],
                "properties": {
                    "inviteCode": {
                        "type": "string"
                    },
                    "email": {
                        "type": "string",
                        "format": "email",
                        "minLength": 1,
                        "pattern": "^[^@]+@[^@]+$",
                        "nullable": false
                    },
                    "password": {
                        "type": "string",
                        "minLength": 8,
                        "pattern": "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$",
                        "nullable": false
                    },
                    "firstName": {
                        "type": "string"
                    },
                    "lastName": {
                        "type": "string"
                    }
                }
            },
            "FastEndpointsProblemDetails": {
                "type": "object",
                "description": "RFC7807 compatible problem details/ error response class. this can be used by configuring startup like so:\napp.UseFastEndpoints(c => c.Errors.UseProblemDetails())",
                "additionalProperties": false,
                "properties": {
                    "type": {
                        "type": "string",
                        "default": "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1"
                    },
                    "title": {
                        "type": "string",
                        "default": "One or more validation errors occurred."
                    },
                    "status": {
                        "type": "integer",
                        "format": "int32",
                        "default": 400
                    },
                    "instance": {
                        "type": "string",
                        "default": "/api/route"
                    },
                    "traceId": {
                        "type": "string",
                        "default": "0HMPNHL0JHL76:00000001"
                    },
                    "detail": {
                        "type": "string",
                        "description": "the details of the error",
                        "nullable": true
                    },
                    "errors": {
                        "type": "array",
                        "items": {
                            "$ref": "#/components/schemas/FastEndpointsProblemDetails_Error"
                        }
                    }
                }
            },
            "FastEndpointsProblemDetails_Error": {
                "type": "object",
                "description": "the error details object",
                "additionalProperties": false,
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "the name of the error or property of the dto that caused the error",
                        "default": "Error or field name"
                    },
                    "reason": {
                        "type": "string",
                        "description": "the reason for the error",
                        "default": "Error reason"
                    },
                    "code": {
                        "type": "string",
                        "description": "the code of the error",
                        "nullable": true
                    },
                    "severity": {
                        "type": "string",
                        "description": "the severity of the error",
                        "nullable": true
                    }
                }
            },
            "MelodyTrackBackendApiAuthRequestsResetPasswordRequest": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "token": {
                        "type": "string"
                    },
                    "newPassword": {
                        "type": "string"
                    },
                    "otp": {
                        "type": "string",
                        "nullable": true
                    }
                }
            },
            "MelodyTrackBackendApiAuthResponsesSetup2FaResponse": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "secret": {
                        "type": "string",
                        "nullable": true
                    },
                    "otpUrl": {
                        "type": "string",
                        "nullable": true
                    }
                }
            },
            "MelodyTrackBackendApiAuthRequestsSetup2FaRequest": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "password": {
                        "type": "string"
                    }
                }
            },
            "MelodyTrackBackendApiAuthRequestsVerify2FaRequest": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "email": {
                        "type": "string",
                        "nullable": true
                    },
                    "otp": {
                        "type": "string"
                    },
                    "otpSecret": {
                        "type": "string"
                    }
                }
            }
        },
        "securitySchemes": {
            "JWTBearerAuth": {
                "type": "http",
                "description": "Enter a JWT token to authorize the requests...",
                "scheme": "Bearer",
                "bearerFormat": "JWT"
            }
        }
    }
} as const