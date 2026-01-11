import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../index';
import { authMiddleware } from '../middleware/auth';
import { candidateUploadSchema, geojsonUploadSchema } from '../utils/validation';

const router = Router();

// Helper to normalize query params to string
const asString = (v: unknown): string | undefined =>
  Array.isArray(v) ? (typeof v[0] === 'string' ? v[0] : undefined) : (typeof v === 'string' ? v : undefined);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Apply auth to all admin routes
router.use(authMiddleware);

// Upload candidates JSON
router.post('/elections/:electionId/upload-candidates', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const electionId = req.params.electionId as string;
    
    if (!req.file) {
      return res.status(400).json({ success: false, errors: [{ message: 'No file uploaded' }] });
    }
    
    // Parse JSON
    let data;
    try {
      data = JSON.parse(req.file.buffer.toString());
    } catch (e) {
      return res.status(400).json({ success: false, errors: [{ message: 'Invalid JSON file' }] });
    }
    
    // Validate against schema
    const { error } = candidateUploadSchema.validate(data, { abortEarly: false });
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({ success: false, errors });
    }
    
    const summary = {
      partiesCreated: 0,
      constituenciesProcessed: 0,
      candidatesCreated: 0,
      logosProcessed: 0,
      logosMissing: 0
    };
    const warnings: string[] = [];
    
    // Process parties
    if (data.parties && Array.isArray(data.parties)) {
      for (const party of data.parties) {
        await prisma.party.upsert({
          where: {
            electionId_partyCode: {
              electionId,
              partyCode: String(party.party_id)
            }
          },
          update: {
            partyName: String(party.party_name),
            partyShort: party.party_short ? String(party.party_short) : undefined,
            partyColor: party.party_color ? String(party.party_color) : undefined,
            partyLogoUrl: party.party_logo_url || party.party_logo_base64 || undefined
          },
          create: {
            electionId,
            partyCode: String(party.party_id),
            partyName: String(party.party_name),
            partyShort: String(party.party_short || ''),
            partyColor: String(party.party_color || '#808080'),
            partyLogoUrl: party.party_logo_url || party.party_logo_base64 || undefined
          }
        });
        summary.partiesCreated++;
      }
    }
    
    // Process constituencies and candidates
    if (data.constituencies && Array.isArray(data.constituencies)) {
      for (const constData of data.constituencies) {
        // Create or update constituency
        const constituency = await prisma.constituency.upsert({
          where: {
            electionId_constituencyCode: {
              electionId,
              constituencyCode: String(constData.constituency_code)
            }
          },
          update: {
            constituencyName: String(constData.constituency_name),
            district: constData.district ? String(constData.district) : null,
            division: constData.division ? String(constData.division) : null
          },
          create: {
            electionId,
            constituencyCode: String(constData.constituency_code),
            constituencyName: String(constData.constituency_name),
            district: constData.district ? String(constData.district) : null,
            division: constData.division ? String(constData.division) : null
          }
        });
        summary.constituenciesProcessed++;
        
        // Process candidates
        if (constData.candidates && Array.isArray(constData.candidates)) {
          for (const candData of constData.candidates) {
            // Find party
            let partyId: string | undefined = undefined;
            if (candData.party_id) {
              const party = await prisma.party.findUnique({
                where: {
                  electionId_partyCode: {
                    electionId,
                    partyCode: candData.party_id
                  }
                }
              });
              partyId = party?.id;
            }
            
            await prisma.candidate.upsert({
              where: {
                electionId_constituencyId_candidateCode: {
                  electionId,
                  constituencyId: constituency.id,
                  candidateCode: String(candData.candidate_id)
                }
              },
              update: {
                name: String(candData.name),
                partyId,
                partyName: candData.party_name ? String(candData.party_name) : undefined,
                partyShort: candData.party_short ? String(candData.party_short) : undefined,
                partyColor: candData.party_color ? String(candData.party_color) : undefined,
                symbol: candData.symbol ? String(candData.symbol) : undefined,
                candidateLogoUrl: candData.candidate_logo_url || candData.candidate_logo_base64 || undefined,
                ballotOrder: candData.ballot_order ?? undefined,
                bio: candData.bio ? String(candData.bio) : undefined
              },
              create: {
                electionId,
                constituencyId: constituency.id,
                candidateCode: String(candData.candidate_id),
                name: String(candData.name),
                partyId,
                partyName: candData.party_name ? String(candData.party_name) : undefined,
                partyShort: candData.party_short ? String(candData.party_short) : undefined,
                partyColor: candData.party_color ? String(candData.party_color) : undefined,
                symbol: candData.symbol ? String(candData.symbol) : undefined,
                candidateLogoUrl: candData.candidate_logo_url || candData.candidate_logo_base64 || undefined,
                ballotOrder: candData.ballot_order ?? undefined,
                bio: candData.bio ? String(candData.bio) : undefined
              }
            });
            summary.candidatesCreated++;
            
            if (candData.candidate_logo_url || candData.candidate_logo_base64) {
              summary.logosProcessed++;
            } else {
              summary.logosMissing++;
              warnings.push(`Candidate ${candData.candidate_id} missing logo`);
            }
          }
        }
      }
    }
    
    res.json({ success: true, summary, warnings: warnings.slice(0, 10) });
  } catch (error) {
    console.error('Upload candidates error:', error);
    res.status(500).json({ success: false, errors: [{ message: 'Failed to process file' }] });
  }
});

// Upload GeoJSON map
router.post('/elections/:electionId/upload-map', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const electionId = req.params.electionId as string;
    
    if (!req.file) {
      return res.status(400).json({ success: false, errors: [{ message: 'No file uploaded' }] });
    }
    
    // Parse GeoJSON
    let geojson;
    try {
      geojson = JSON.parse(req.file.buffer.toString());
    } catch (e) {
      return res.status(400).json({ success: false, errors: [{ message: 'Invalid GeoJSON file' }] });
    }
    
    // Validate against schema
    const { error } = geojsonUploadSchema.validate(geojson, { abortEarly: false });
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({ success: false, errors });
    }
    
    const summary = {
      featuresProcessed: 0,
      constituenciesMatched: 0,
      constituenciesUnmatched: 0
    };
    
    for (const feature of geojson.features) {
      const props = feature.properties;
      const code = props.constituency_code;
      
      if (!code) {
        summary.constituenciesUnmatched++;
        continue;
      }
      
      // Update constituency with geo properties
      const updated = await prisma.constituency.updateMany({
        where: {
          electionId,
          constituencyCode: code
        },
        data: {
          geoProperties: {
            ...props,
            geometry: feature.geometry
          }
        }
      });
      
      if (updated.count > 0) {
        summary.constituenciesMatched++;
      } else {
        summary.constituenciesUnmatched++;
      }
      summary.featuresProcessed++;
    }
    
    // Update election with map file reference
    await prisma.election.update({
      where: { id: electionId },
      data: { mapFileUrl: `uploaded-${Date.now()}.geojson` }
    });
    
    res.json({ success: true, summary });
  } catch (error) {
    console.error('Upload map error:', error);
    res.status(500).json({ success: false, errors: [{ message: 'Failed to process file' }] });
  }
});

// Get election statistics
router.get('/elections/:electionId/stats', async (req: Request, res: Response) => {
  try {
    const electionId = req.params.electionId as string;
    
    const [election, voteCount, constituencyCount, candidateCount] = await Promise.all([
      prisma.election.findUnique({ where: { id: electionId } }),
      prisma.vote.count({ where: { electionId } }),
      prisma.constituency.count({ where: { electionId } }),
      prisma.candidate.count({ where: { electionId } })
    ]);
    
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }
    
    res.json({
      election: {
        id: election.id,
        name: election.name,
        status: election.status
      },
      stats: {
        totalVotes: voteCount,
        totalConstituencies: constituencyCount,
        totalCandidates: candidateCount
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
