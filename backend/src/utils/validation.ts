import Joi from 'joi';

/**
 * Validation schemas for API requests
 */

// Device verification
export const verifyDeviceSchema = Joi.object({
  fingerprintData: Joi.object({
    visitorId: Joi.string().required(),
    components: Joi.object().required(),
    confidence: Joi.object({
      score: Joi.number().required()
    }).required()
  }).required(),
  electionId: Joi.string().uuid().required()
});

// Vote casting
export const castVoteSchema = Joi.object({
  constituencyId: Joi.string().uuid().required(),
  candidateId: Joi.string().uuid().required()
});

// Election creation
export const createElectionSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(1000).allow('', null),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  authConfig: Joi.object({
    method: Joi.string().valid('device_fingerprint').default('device_fingerprint'),
    settings: Joi.object({
      strictness: Joi.string().valid('low', 'medium', 'high').default('high')
    })
  }).default({ method: 'device_fingerprint', settings: { strictness: 'high' } })
});

// Election status update
export const updateElectionStatusSchema = Joi.object({
  status: Joi.string().valid('draft', 'active', 'paused', 'completed', 'cancelled').required()
});

// Admin login
export const adminLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

// Admin registration
export const adminRegisterSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  fullName: Joi.string().min(2).max(255).required(),
  role: Joi.string().valid('admin', 'super_admin').default('admin')
});

// Candidate JSON validation
export const candidateUploadSchema = Joi.object({
  election_id: Joi.string().required(),
  election_name: Joi.string().required(),
  upload_timestamp: Joi.string().isoDate().required(),
  
  parties: Joi.array().items(
    Joi.object({
      party_id: Joi.string().required(),
      party_name: Joi.string().required(),
      party_short: Joi.string().max(10).required(),
      party_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required()
        .messages({
          'string.pattern.base': 'party_color must be a valid hex color (#RRGGBB)'
        }),
      party_logo_url: Joi.string().uri().allow(null),
      party_logo_base64: Joi.string().pattern(/^data:image\//).allow(null)
    })
  ).required(),
  
  constituencies: Joi.array().items(
    Joi.object({
      constituency_id: Joi.string().required(),
      constituency_name: Joi.string().required(),
      constituency_code: Joi.string().required(),
      district: Joi.string().allow('', null),
      division: Joi.string().allow('', null),
      
      candidates: Joi.array().items(
        Joi.object({
          candidate_id: Joi.string().required(),
          name: Joi.string().required(),
          party_id: Joi.string().required(),
          party_name: Joi.string().required(),
          party_short: Joi.string().required(),
          party_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
          symbol: Joi.string().required(),
          candidate_logo_url: Joi.string().uri().allow(null),
          candidate_logo_base64: Joi.string().pattern(/^data:image\//).allow(null),
          ballot_order: Joi.number().integer().positive().required(),
          bio: Joi.string().max(500).allow('', null)
        })
      ).required()
    })
  ).required()
});

// GeoJSON validation
export const geojsonUploadSchema = Joi.object({
  type: Joi.string().valid('FeatureCollection').required(),
  features: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('Feature').required(),
      properties: Joi.object({
        constituency_code: Joi.string().required(),
        constituency_name: Joi.string().required(),
        district: Joi.string().allow('', null),
        division: Joi.string().allow('', null)
      }).unknown(true).required(),
      geometry: Joi.object({
        type: Joi.string().valid('Polygon', 'MultiPolygon').required(),
        coordinates: Joi.array().required()
      }).required()
    })
  ).required()
});

/**
 * Middleware to validate request body
 */
export function validate(schema: Joi.ObjectSchema) {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        errors
      });
    }
    
    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
}

/**
 * Middleware to validate query parameters
 */
export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        errors
      });
    }
    
    req.query = value;
    next();
  };
}
