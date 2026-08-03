-- Client + Month Review Status and Feedback
-- One record per client_id + service_month combination
-- Tracks review status (reviewed or not) and user feedback

CREATE TABLE claims_anomaly.client_month_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id INTEGER NOT NULL,
    service_month VARCHAR(10) NOT NULL,
    status VARCHAR(50),
    feedback TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, service_month)
);

CREATE INDEX idx_client_month_reviews_status ON claims_anomaly.client_month_reviews(status);
CREATE INDEX idx_client_month_reviews_client_month ON claims_anomaly.client_month_reviews(client_id, service_month);
