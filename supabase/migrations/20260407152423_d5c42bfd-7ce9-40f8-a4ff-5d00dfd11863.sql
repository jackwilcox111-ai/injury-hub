
UPDATE referrals SET status = 'Sent', responded_at = NULL
WHERE status = 'Accepted' AND referral_method = 'Platform';
