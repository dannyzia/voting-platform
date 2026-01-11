-- Migration: Add database triggers for automatic vote counting
-- This file should be executed after prisma db push

-- ============================================
-- FUNCTION: Update vote results after vote insert
-- ============================================
CREATE OR REPLACE FUNCTION update_vote_results()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment vote count for the candidate in this constituency
  INSERT INTO vote_results (election_id, constituency_id, candidate_id, vote_count, last_updated)
  VALUES (NEW.election_id, NEW.constituency_id, NEW.candidate_id, 1, CURRENT_TIMESTAMP)
  ON CONFLICT (election_id, constituency_id, candidate_id)
  DO UPDATE SET
    vote_count = vote_results.vote_count + 1,
    last_updated = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-update vote_results on vote insert
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_vote_results ON votes;
CREATE TRIGGER trigger_update_vote_results
AFTER INSERT ON votes
FOR EACH ROW
EXECUTE FUNCTION update_vote_results();

-- ============================================
-- FUNCTION: Calculate vote percentages
-- ============================================
CREATE OR REPLACE FUNCTION calculate_vote_percentages()
RETURNS TRIGGER AS $$
DECLARE
  total_votes INTEGER;
BEGIN
  -- Get total votes for this constituency
  SELECT SUM(vote_count) INTO total_votes
  FROM vote_results
  WHERE election_id = NEW.election_id
    AND constituency_id = NEW.constituency_id;
  
  -- Update all percentages for this constituency
  UPDATE vote_results
  SET vote_percentage = CASE
    WHEN total_votes > 0 THEN (vote_count::DECIMAL / total_votes * 100)
    ELSE 0
  END
  WHERE election_id = NEW.election_id
    AND constituency_id = NEW.constituency_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-calculate percentages on vote_results update
-- ============================================
DROP TRIGGER IF EXISTS trigger_calculate_percentages ON vote_results;
CREATE TRIGGER trigger_calculate_percentages
AFTER INSERT OR UPDATE ON vote_results
FOR EACH ROW
EXECUTE FUNCTION calculate_vote_percentages();

-- ============================================
-- FUNCTION: Update constituency results after vote
-- ============================================
CREATE OR REPLACE FUNCTION update_constituency_results()
RETURNS TRIGGER AS $$
DECLARE
  winner_record RECORD;
  runner_up_record RECORD;
  total_votes_count INTEGER;
BEGIN
  -- Get total votes for this constituency
  SELECT SUM(vote_count) INTO total_votes_count
  FROM vote_results
  WHERE election_id = NEW.election_id
    AND constituency_id = NEW.constituency_id;
  
  -- Get winner (highest vote count)
  SELECT candidate_id, vote_count
  INTO winner_record
  FROM vote_results
  WHERE election_id = NEW.election_id
    AND constituency_id = NEW.constituency_id
  ORDER BY vote_count DESC
  LIMIT 1;
  
  -- Get runner-up (second highest)
  SELECT vote_count
  INTO runner_up_record
  FROM vote_results
  WHERE election_id = NEW.election_id
    AND constituency_id = NEW.constituency_id
  ORDER BY vote_count DESC
  OFFSET 1
  LIMIT 1;
  
  -- Update or insert constituency_results
  -- Note: map_color will be updated by application code
  INSERT INTO constituency_results (
    election_id,
    constituency_id,
    map_color,
    total_votes_cast,
    winning_candidate_id,
    winning_percentage,
    victory_margin,
    last_updated
  )
  VALUES (
    NEW.election_id,
    NEW.constituency_id,
    '#E0E0E0',
    total_votes_count,
    winner_record.candidate_id,
    CASE WHEN total_votes_count > 0 THEN (winner_record.vote_count::DECIMAL / total_votes_count * 100) ELSE 0 END,
    CASE WHEN runner_up_record.vote_count IS NOT NULL AND total_votes_count > 0 
      THEN ((winner_record.vote_count - runner_up_record.vote_count)::DECIMAL / total_votes_count * 100)
      ELSE 0 
    END,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (election_id, constituency_id)
  DO UPDATE SET
    total_votes_cast = total_votes_count,
    winning_candidate_id = winner_record.candidate_id,
    winning_percentage = CASE WHEN total_votes_count > 0 THEN (winner_record.vote_count::DECIMAL / total_votes_count * 100) ELSE 0 END,
    victory_margin = CASE WHEN runner_up_record.vote_count IS NOT NULL AND total_votes_count > 0 
      THEN ((winner_record.vote_count - runner_up_record.vote_count)::DECIMAL / total_votes_count * 100)
      ELSE 0 
    END,
    last_updated = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Update constituency results after vote_results change
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_constituency_results ON vote_results;
CREATE TRIGGER trigger_update_constituency_results
AFTER INSERT OR UPDATE ON vote_results
FOR EACH ROW
EXECUTE FUNCTION update_constituency_results();
