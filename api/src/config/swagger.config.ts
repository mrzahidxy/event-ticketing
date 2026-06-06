import { OAS3Definition, OAS3Options } from 'swagger-jsdoc';

import { appConfig } from './app';

const healthPaths: OAS3Definition['paths'] = {
  '/health': {
    servers: [
      {
        url: '/',
        description: 'Root server (health & non-versioned routes)',
      },
    ],
    get: {
      tags: ['Health'],
      summary: 'Service health status',
      description: 'Returns a minimal API health response without exposing internals.',
      responses: {
        200: {
          description: 'Service is reachable',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['ok'],
                    example: 'ok',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const authPaths: OAS3Definition['paths'] = {
  '/auth/register': {
    post: {
      summary: 'Register a new user',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                },
                password: {
                  type: 'string',
                  minLength: 8,
                },
                name: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'User registered successfully',
        },
        400: {
          description: 'Validation error',
        },
        409: {
          description: 'User already exists',
        },
      },
    },
  },
  '/auth/login': {
    post: {
      summary: 'Login user',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                },
                password: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Login successful',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Invalid credentials',
        },
      },
    },
  },
  '/auth/refresh': {
    post: {
      summary: 'Refresh the current session',
      tags: ['Auth'],
      description:
        'Issues a new access token and rotates the refresh token using the HttpOnly refresh-token cookie. If the current bearer token is sent, it will be blacklisted.',
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        200: {
          description: 'Session refreshed successfully',
        },
        401: {
          description: 'Refresh token missing or invalid',
        },
      },
    },
  },
  '/auth/logout': {
    post: {
      summary: 'Logout the current session',
      tags: ['Auth'],
      description:
        'Revokes the refresh token from the HttpOnly cookie and blacklists the current bearer token when it is provided.',
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        204: {
          description: 'Session revoked successfully',
        },
      },
    },
  },
  '/auth/me': {
    get: {
      summary: 'Get current user profile',
      tags: ['Auth'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        200: {
          description: 'User profile retrieved successfully',
        },
        401: {
          description: 'Unauthorized',
        },
      },
    },
  },
};

const bookingPaths: OAS3Definition['paths'] = {
  '/bookings': {
    get: {
      operationId: 'listBookings',
      summary: 'Get all bookings',
      tags: ['Bookings'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
          },
          description: 'Page number',
        },
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
          },
          description: 'Number of items per page',
        },
        {
          in: 'query',
          name: 'status',
          schema: {
            type: 'string',
          },
          description: 'Filter by booking status (comma-separated list, e.g. PENDING,CONFIRMED)',
          example: 'PENDING,CONFIRMED',
        },
        {
          in: 'query',
          name: 'eventName',
          schema: {
            type: 'string',
          },
          description: 'Filter by event name (partial match, case-insensitive)',
          example: 'Summit',
        },
        {
          in: 'query',
          name: 'search',
          schema: {
            type: 'string',
          },
          description: 'Search by booking guest, contact, or event name (case-insensitive)',
          example: 'john',
        },
        {
          in: 'query',
          name: 'checkInFrom',
          schema: {
            type: 'string',
            format: 'date',
          },
          description: 'Filter bookings with check-in date from this date onwards',
          example: '2024-01-01',
        },
        {
          in: 'query',
          name: 'checkInTo',
          schema: {
            type: 'string',
            format: 'date',
          },
          description: 'Filter bookings with check-in date up to this date',
          example: '2024-12-31',
        },
        {
          in: 'query',
          name: 'checkOutFrom',
          schema: {
            type: 'string',
            format: 'date',
          },
          description: 'Filter bookings with check-out date from this date onwards',
          example: '2024-01-01',
        },
        {
          in: 'query',
          name: 'checkOutTo',
          schema: {
            type: 'string',
            format: 'date',
          },
          description: 'Filter bookings with check-out date up to this date',
          example: '2024-12-31',
        },
      ],
      responses: {
        200: {
          description: 'List of bookings',
        },
        401: {
          description: 'Unauthorized',
        },
      },
    },
    post: {
      operationId: 'createBooking',
      summary: 'Create a new booking',
      tags: ['Bookings'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['eventId', 'checkIn', 'checkOut'],
              properties: {
                eventId: {
                  type: 'string',
                  format: 'uuid',
                },
                checkIn: {
                  type: 'string',
                  format: 'date',
                },
                checkOut: {
                  type: 'string',
                  format: 'date',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Booking created successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
      },
    },
  },
  '/bookings/{id}': {
    get: {
      operationId: 'getBookingById',
      summary: 'Get a booking by ID',
      tags: ['Bookings'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'integer',
          },
        },
      ],
      responses: {
        200: {
          description: 'Booking details',
        },
        404: {
          description: 'Booking not found',
        },
      },
    },
    patch: {
      operationId: 'updateBooking',
      summary: 'Update a booking',
      tags: ['Bookings'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'integer',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                checkIn: {
                  type: 'string',
                  format: 'date',
                },
                checkOut: {
                  type: 'string',
                  format: 'date',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Booking updated successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'Booking not found',
        },
      },
    },
    delete: {
      operationId: 'deleteBooking',
      summary: 'Delete a booking',
      tags: ['Bookings'],
      description: 'Requires admin privileges.',
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'integer',
          },
        },
      ],
      responses: {
        204: {
          description: 'Booking deleted successfully',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden (Admin only)',
        },
        404: {
          description: 'Booking not found',
        },
      },
    },
  },
};

const userPaths: OAS3Definition['paths'] = {
  '/users': {
    get: {
      summary: 'List users',
      description: 'Returns a paginated list of users. Requires admin privileges.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
          },
          description: 'Page number (defaults to 1)',
        },
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
          },
          description: 'Number of users per page (defaults to 10)',
        },
        {
          in: 'query',
          name: 'role',
          schema: {
            type: 'string',
            enum: ['USER', 'STAFF', 'OWNER', 'ADMIN'],
          },
          description: 'Filter users by role',
        },
        {
          in: 'query',
          name: 'search',
          schema: {
            type: 'string',
          },
          description: 'Search by email or name (case-insensitive)',
          example: 'john',
        },
      ],
      responses: {
        200: {
          description: 'List of users',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
      },
    },
    post: {
      summary: 'Create a new user',
      description: 'Creates a new user. Requires admin privileges.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                },
                name: {
                  type: 'string',
                  nullable: true,
                },
                password: {
                  type: 'string',
                  minLength: 6,
                },
                role: {
                  type: 'string',
                  enum: ['USER', 'STAFF', 'OWNER', 'ADMIN'],
                },
                permissions: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'User created successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        409: {
          description: 'User with the same email already exists',
        },
      },
    },
  },
  '/users/{id}': {
    get: {
      summary: 'Get user by ID',
      description: 'Returns the user details. Users may view their own profile; admins can view any user.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'integer',
          },
        },
      ],
      responses: {
        200: {
          description: 'User details',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'User not found',
        },
      },
    },
    patch: {
      summary: 'Update user profile',
      description: 'Allows users to update their own profile details. Admins can update any user.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'integer',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                },
                name: {
                  type: 'string',
                  nullable: true,
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'User updated successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'User not found',
        },
        409: {
          description: 'Email conflict',
        },
      },
    },
    delete: {
      summary: 'Delete a user',
      description: 'Deletes a user account. Requires admin privileges.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'integer',
          },
        },
      ],
      responses: {
        204: {
          description: 'User deleted successfully',
        },
        400: {
          description: 'Cannot delete the currently authenticated user',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'User not found',
        },
      },
    },
  },
  '/users/{id}/role': {
    patch: {
      summary: 'Update user role',
      description:
        'Updates the role for the specified user. Requires admin privileges and cannot target the current user.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'integer',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['role'],
              properties: {
                role: {
                  type: 'string',
                  enum: ['USER', 'STAFF', 'OWNER', 'ADMIN'],
                },
                permissions: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'User role updated successfully',
        },
        400: {
          description: 'Invalid request or attempting to update self role',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'User not found',
        },
      },
    },
  },
};

const organizerPaths: OAS3Definition['paths'] = {
  '/organizers': {
    post: {
      summary: 'Create an organizer',
      description: 'Owners create their own organizer. Admins can create for an owner by providing ownerId.',
      tags: ['Organizers'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: {
                  type: 'string',
                },
                ownerId: {
                  type: 'integer',
                  description: 'Required for admins creating an organizer for an owner.',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Organizer created successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        409: {
          description: 'Owner already has an organizer',
        },
      },
    },
  },
  '/organizers/{organizerId}': {
    get: {
      summary: 'Get an organizer profile',
      description: 'Requires owner, assigned staff, or admin.',
      tags: ['Organizers'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'organizerId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        200: {
          description: 'Organizer profile',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'Organizer not found',
        },
      },
    },
    patch: {
      summary: 'Update an organizer profile',
      description: 'Requires owner, assigned staff, or admin.',
      tags: ['Organizers'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'organizerId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Organizer updated successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'Organizer not found',
        },
      },
    },
  },
  '/organizers/{organizerId}/events': {
    get: {
      summary: 'List events for an organizer',
      description: 'Owners/admins see all events; others see published events only.',
      tags: ['Events'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'organizerId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        200: {
          description: 'List of events',
        },
        401: {
          description: 'Unauthorized',
        },
        404: {
          description: 'Organizer not found',
        },
      },
    },
    post: {
      summary: 'Create an event',
      description: 'Requires owner or admin privileges.',
      tags: ['Events'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'organizerId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'price'],
              properties: {
                name: {
                  type: 'string',
                },
                description: {
                  type: 'string',
                },
                price: {
                  type: 'number',
                  minimum: 0.01,
                },
                isPublished: {
                  type: 'boolean',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Event created successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'Organizer not found',
        },
      },
    },
  },
  '/organizers/{organizerId}/events/{eventId}': {
    patch: {
      summary: 'Update an event',
      description: 'Requires owner or admin privileges.',
      tags: ['Events'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'organizerId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          in: 'path',
          name: 'eventId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                },
                description: {
                  type: 'string',
                  nullable: true,
                },
                price: {
                  type: 'number',
                  minimum: 0.01,
                },
                isPublished: {
                  type: 'boolean',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Event updated successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'Event not found',
        },
      },
    },
    delete: {
      summary: 'Delete an event',
      description: 'Requires owner or admin privileges.',
      tags: ['Events'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'organizerId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          in: 'path',
          name: 'eventId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        204: {
          description: 'Event deleted successfully',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'Event not found',
        },
      },
    },
  },
  '/organizers/{organizerId}/staff': {
    get: {
      summary: 'List staff assignments',
      description: 'Requires owner or admin privileges.',
      tags: ['Organizers'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'organizerId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        200: {
          description: 'List of staff assignments',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'Organizer not found',
        },
      },
    },
    post: {
      summary: 'Assign a staff member',
      description: 'Requires owner or admin privileges. User must have the STAFF role.',
      tags: ['Organizers'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'organizerId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['userId'],
              properties: {
                userId: {
                  type: 'integer',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Staff member assigned successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'User or organizer not found',
        },
      },
    },
  },
  '/organizers/{organizerId}/staff/{userId}': {
    delete: {
      summary: 'Remove a staff member',
      description: 'Requires owner or admin privileges.',
      tags: ['Organizers'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'organizerId',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
        {
          in: 'path',
          name: 'userId',
          required: true,
          schema: {
            type: 'integer',
          },
        },
      ],
      responses: {
        204: {
          description: 'Staff member removed successfully',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'Staff assignment not found',
        },
      },
    },
  },
};

const paymentPaths: OAS3Definition['paths'] = {
  '/payments/checkout-session': {
    post: {
      summary: 'Create a Stripe checkout session',
      tags: ['Payments'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['bookingId', 'successUrl', 'cancelUrl'],
              properties: {
                bookingId: {
                  type: 'integer',
                },
                successUrl: {
                  type: 'string',
                  format: 'uri',
                },
                cancelUrl: {
                  type: 'string',
                  format: 'uri',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Checkout session created',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
      },
    },
  },
  '/payments/history': {
    get: {
      summary: 'Get payment history for current user',
      tags: ['Payments'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        200: {
          description: 'Payment history retrieved',
        },
        401: {
          description: 'Unauthorized',
        },
      },
    },
  },
  '/payments/webhook': {
    post: {
      summary: 'Handle Stripe webhook events',
      tags: ['Payments'],
      description: 'Validates Stripe signatures and reconciles payment and booking state.',
      responses: {
        200: {
          description: 'Webhook received successfully',
        },
        400: {
          description: 'Invalid webhook signature or payload',
        },
        503: {
          description: 'Stripe webhooks are not configured',
        },
      },
    },
  },
};

type SwaggerParameters = NonNullable<
  NonNullable<NonNullable<OAS3Definition['paths']>['/health']>['get']
>['parameters'];

const analyticsQueryParameters: SwaggerParameters = [
  {
    in: 'query',
    name: 'organizerId',
    required: false,
    schema: {
      type: 'string',
      format: 'uuid',
    },
    description:
      'Optional organizer scope. Admins may omit this for platform-wide analytics. Owners and staff are automatically constrained to their allowed organizers.',
  },
  {
    in: 'query',
    name: 'dateFrom',
    required: false,
    schema: {
      type: 'string',
      format: 'date-time',
    },
    description: 'Inclusive UTC start date. Defaults to the last 30 days.',
  },
  {
    in: 'query',
    name: 'dateTo',
    required: false,
    schema: {
      type: 'string',
      format: 'date-time',
    },
    description: 'Inclusive UTC end date. Defaults to now.',
  },
  {
    in: 'query',
    name: 'granularity',
    required: false,
    schema: {
      type: 'string',
      enum: ['day', 'week', 'month'],
      default: 'day',
    },
    description: 'Bucket size for trend series.',
  },
  {
    in: 'query',
    name: 'page',
    required: false,
    schema: {
      type: 'integer',
      minimum: 1,
      default: 1,
    },
    description: 'Pagination page for paginated analytics segments.',
  },
  {
    in: 'query',
    name: 'limit',
    required: false,
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 10,
    },
    description: 'Pagination size for paginated analytics segments.',
  },
  {
    in: 'query',
    name: 'topLimit',
    required: false,
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: 20,
      default: 5,
    },
    description: 'Number of top-performing events to return in overview responses.',
  },
];

const analyticsPaths: OAS3Definition['paths'] = {
  '/analytics/overview': {
    get: {
      summary: 'Get platform or organizer analytics overview',
      tags: ['Analytics'],
      description:
        'Returns aggregated booking, payment, event, and user analytics for the caller scope.',
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: analyticsQueryParameters,
      responses: {
        200: {
          description: 'Analytics overview retrieved successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
      },
    },
  },
  '/analytics/bookings': {
    get: {
      summary: 'Get booking analytics',
      tags: ['Analytics'],
      description:
        'Returns booking totals, status breakdowns, revenue metrics, trends, and top-performing events.',
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: analyticsQueryParameters,
      responses: {
        200: {
          description: 'Booking analytics retrieved successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
      },
    },
  },
  '/analytics/payments': {
    get: {
      summary: 'Get payment analytics',
      tags: ['Analytics'],
      description:
        'Returns payment totals, revenue by status, success and failure rates, and time-series revenue trends.',
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: analyticsQueryParameters,
      responses: {
        200: {
          description: 'Payment analytics retrieved successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
      },
    },
  },
  '/analytics/events': {
    get: {
      summary: 'Get event analytics',
      tags: ['Analytics'],
      description:
        'Returns event counts, publication breakdowns, average pricing, and popular events by booking volume.',
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: analyticsQueryParameters,
      responses: {
        200: {
          description: 'Event analytics retrieved successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
      },
    },
  },
  '/analytics/users': {
    get: {
      summary: 'Get user and staff analytics',
      tags: ['Analytics'],
      description:
        'Returns scoped user totals, registration trends, active users by role, and staff performance metrics.',
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: analyticsQueryParameters,
      responses: {
        200: {
          description: 'User analytics retrieved successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
      },
    },
  },
};

const swaggerDefinition: OAS3Definition = {
  openapi: '3.0.0',
  info: {
    title: appConfig.name,
    version: '1.5.0',
    description: appConfig.description,
  },
  servers: [
    {
      url: '/api',
      description: 'API',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Paste the raw access token only. Swagger UI adds the Bearer prefix automatically.',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Service health endpoints',
    },
    {
      name: 'Auth',
      description: 'Authentication endpoints',
    },
    {
      name: 'Bookings',
      description: 'Booking management endpoints',
    },
    {
      name: 'Organizers',
      description: 'Organizer profile and staff management endpoints',
    },
    {
      name: 'Events',
      description: 'Event catalog endpoints',
    },
    {
      name: 'Users',
      description: 'User management endpoints',
    },
    {
      name: 'Payments',
      description: 'Payment processing endpoints',
    },
    {
      name: 'Analytics',
      description: 'Aggregated booking, payment, event, and user reporting endpoints',
    },
  ],
  paths: {
    ...healthPaths,
    ...authPaths,
    ...bookingPaths,
    ...organizerPaths,
    ...userPaths,
    ...paymentPaths,
    ...analyticsPaths,
  },
};

const swaggerOptions: OAS3Options = {
  definition: swaggerDefinition,
  apis: [],
};

export { swaggerDefinition, swaggerOptions };
