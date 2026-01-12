-- =============================================
-- SportAI User Feedback Report Queries
-- Run these in Supabase SQL Editor with service role
-- =============================================

-- =============================================
-- 1. FEEDBACK OVERVIEW DASHBOARD
-- High-level stats for the UX team
-- =============================================
SELECT 
  COUNT(*) AS total_feedback,
  COUNT(CASE WHEN feedback_type = 'up' THEN 1 END) AS thumbs_up,
  COUNT(CASE WHEN feedback_type = 'down' THEN 1 END) AS thumbs_down,
  ROUND(
    COUNT(CASE WHEN feedback_type = 'up' THEN 1 END)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    1
  ) AS satisfaction_rate_percent,
  COUNT(CASE WHEN comment IS NOT NULL AND comment != '' THEN 1 END) AS feedback_with_comments,
  COUNT(DISTINCT user_id) AS unique_users_who_gave_feedback,
  MIN(created_at) AS first_feedback_date,
  MAX(created_at) AS last_feedback_date
FROM message_feedback;


-- =============================================
-- 2. NEGATIVE FEEDBACK REASONS BREAKDOWN
-- What users complain about most (for prioritization)
-- =============================================
SELECT
  reason,
  COUNT(*) AS occurrence_count,
  ROUND(
    COUNT(*)::numeric / 
    (SELECT COUNT(*) FROM message_feedback WHERE feedback_type = 'down') * 100,
    1
  ) AS percent_of_negative_feedback,
  CASE reason
    WHEN 'inaccurate' THEN 'Inaccurate or wrong information'
    WHEN 'unclear' THEN 'Unclear or confusing'
    WHEN 'incomplete' THEN 'Missing important information'
    WHEN 'irrelevant' THEN 'Not relevant to my question'
    WHEN 'too_long' THEN 'Too long or verbose'
    WHEN 'too_short' THEN 'Too short or not enough detail'
    ELSE reason
  END AS reason_label
FROM message_feedback, UNNEST(reasons) AS reason
WHERE feedback_type = 'down'
GROUP BY reason
ORDER BY occurrence_count DESC;


-- =============================================
-- 3. POSITIVE FEEDBACK REASONS BREAKDOWN
-- What users like most (what to maintain)
-- =============================================
SELECT
  reason,
  COUNT(*) AS occurrence_count,
  ROUND(
    COUNT(*)::numeric / 
    (SELECT COUNT(*) FROM message_feedback WHERE feedback_type = 'up') * 100,
    1
  ) AS percent_of_positive_feedback,
  CASE reason
    WHEN 'accurate' THEN 'Accurate information'
    WHEN 'helpful' THEN 'Helpful explanation'
    WHEN 'detailed' THEN 'Good level of detail'
    WHEN 'clear' THEN 'Clear and easy to understand'
    WHEN 'actionable' THEN 'Actionable advice'
    ELSE reason
  END AS reason_label
FROM message_feedback, UNNEST(reasons) AS reason
WHERE feedback_type = 'up'
GROUP BY reason
ORDER BY occurrence_count DESC;


-- =============================================
-- 4. ALL FEEDBACK WITH COMMENTS (FOR UX DEEP DIVE)
-- The goldmine - actual user comments
-- =============================================
SELECT
  mf.created_at,
  mf.feedback_type,
  CASE mf.feedback_type 
    WHEN 'up' THEN '👍 Positive' 
    WHEN 'down' THEN '👎 Negative' 
  END AS feedback_label,
  mf.reasons,
  mf.comment,
  LEFT(mf.message_content, 500) AS ai_response_preview,
  p.email AS user_email,
  COALESCE(p.full_name, 'Anonymous') AS user_name
FROM message_feedback mf
LEFT JOIN profiles p ON mf.user_id = p.id
WHERE mf.comment IS NOT NULL AND mf.comment != ''
ORDER BY mf.created_at DESC;


-- =============================================
-- 5. RECENT NEGATIVE FEEDBACK (LAST 30 DAYS)
-- Recent issues to address immediately
-- =============================================
SELECT
  mf.created_at,
  mf.reasons,
  mf.comment,
  LEFT(mf.message_content, 300) AS ai_response_preview,
  p.email AS user_email,
  COALESCE(p.full_name, 'Anonymous') AS user_name
FROM message_feedback mf
LEFT JOIN profiles p ON mf.user_id = p.id
WHERE 
  mf.feedback_type = 'down'
  AND mf.created_at >= NOW() - INTERVAL '30 days'
ORDER BY mf.created_at DESC;


-- =============================================
-- 6. FEEDBACK TRENDS BY WEEK
-- See if satisfaction is improving over time
-- =============================================
SELECT
  DATE_TRUNC('week', created_at) AS week,
  COUNT(*) AS total_feedback,
  COUNT(CASE WHEN feedback_type = 'up' THEN 1 END) AS thumbs_up,
  COUNT(CASE WHEN feedback_type = 'down' THEN 1 END) AS thumbs_down,
  ROUND(
    COUNT(CASE WHEN feedback_type = 'up' THEN 1 END)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    1
  ) AS satisfaction_rate
FROM message_feedback
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;


-- =============================================
-- 7. FEEDBACK BY DAY OF WEEK
-- When do users give most feedback?
-- =============================================
SELECT
  TO_CHAR(created_at, 'Day') AS day_of_week,
  EXTRACT(DOW FROM created_at) AS day_number,
  COUNT(*) AS total_feedback,
  COUNT(CASE WHEN feedback_type = 'down' THEN 1 END) AS negative_count
FROM message_feedback
GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)
ORDER BY day_number;


-- =============================================
-- 8. USERS WHO GAVE MOST NEGATIVE FEEDBACK
-- Potential power users or frustrated users to reach out to
-- =============================================
SELECT
  p.email,
  COALESCE(p.full_name, 'Unknown') AS user_name,
  COUNT(*) AS total_negative_feedback,
  COUNT(CASE WHEN mf.comment IS NOT NULL AND mf.comment != '' THEN 1 END) AS feedback_with_comments,
  MAX(mf.created_at) AS last_feedback_date
FROM message_feedback mf
JOIN profiles p ON mf.user_id = p.id
WHERE mf.feedback_type = 'down'
GROUP BY p.id, p.email, p.full_name
ORDER BY total_negative_feedback DESC
LIMIT 20;


-- =============================================
-- 9. FULL EXPORT FOR CSV/SPREADSHEET
-- All feedback data for external analysis
-- =============================================
SELECT
  mf.id AS feedback_id,
  mf.created_at,
  mf.feedback_type,
  ARRAY_TO_STRING(mf.reasons, ', ') AS reasons_list,
  mf.comment,
  mf.message_content AS ai_response_full,
  mf.message_id,
  mf.chat_id,
  p.email AS user_email,
  COALESCE(p.full_name, 'Anonymous') AS user_name,
  p.id AS user_id
FROM message_feedback mf
LEFT JOIN profiles p ON mf.user_id = p.id
ORDER BY mf.created_at DESC;


-- =============================================
-- 10. NEGATIVE FEEDBACK WITH FULL AI RESPONSE
-- For debugging specific issues
-- =============================================
SELECT
  mf.created_at,
  ARRAY_TO_STRING(mf.reasons, ', ') AS reasons,
  mf.comment AS user_comment,
  mf.message_content AS full_ai_response,
  p.email
FROM message_feedback mf
LEFT JOIN profiles p ON mf.user_id = p.id
WHERE mf.feedback_type = 'down'
ORDER BY mf.created_at DESC
LIMIT 50;


-- =============================================
-- 11. ANONYMOUS VS AUTHENTICATED FEEDBACK
-- See if logged-in users give different feedback
-- =============================================
SELECT
  CASE WHEN user_id IS NULL THEN 'Anonymous' ELSE 'Authenticated' END AS user_type,
  COUNT(*) AS total_feedback,
  COUNT(CASE WHEN feedback_type = 'up' THEN 1 END) AS thumbs_up,
  COUNT(CASE WHEN feedback_type = 'down' THEN 1 END) AS thumbs_down,
  ROUND(
    COUNT(CASE WHEN feedback_type = 'up' THEN 1 END)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    1
  ) AS satisfaction_rate
FROM message_feedback
GROUP BY CASE WHEN user_id IS NULL THEN 'Anonymous' ELSE 'Authenticated' END;


-- =============================================
-- 12. FEEDBACK VOLUME BY MONTH (FOR CHARTS)
-- Monthly trend data
-- =============================================
SELECT
  TO_CHAR(created_at, 'YYYY-MM') AS month,
  COUNT(*) AS total,
  COUNT(CASE WHEN feedback_type = 'up' THEN 1 END) AS positive,
  COUNT(CASE WHEN feedback_type = 'down' THEN 1 END) AS negative
FROM message_feedback
GROUP BY TO_CHAR(created_at, 'YYYY-MM')
ORDER BY month DESC;

