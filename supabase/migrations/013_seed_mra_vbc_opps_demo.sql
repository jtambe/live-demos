-- MRA VBC Opportunities: Demo Seed Data
-- NOTE: With Supabase Auth, Supabase Auth users must be created separately.
-- This migration creates user records in mra_vbc_opps.users for role/provider management.
-- Use backend setup script to create Supabase Auth users with "Saludhealth" password.

-- Seed providers
INSERT INTO mra_vbc_opps.providers (name, provider_group) VALUES
('Palm Medical Group', 'Independent Practice'),
('Sunshine Health Center', 'Independent Practice'),
('Coastal Primary Care', 'Corporate Network')
ON CONFLICT (name, provider_group) DO NOTHING;

-- Seed demo users (provider assignments handled via admin UI)
INSERT INTO mra_vbc_opps.users (email, password_hash, role) VALUES
('admin1@vbc.com', '7a744431be530cb4e5cc211fce731253ef403bd52db98f5e67b79b1a4a6ddb94', 'Admin'),
('admin2@vbc.com', '7a744431be530cb4e5cc211fce731253ef403bd52db98f5e67b79b1a4a6ddb94', 'Admin'),
('user1@vbc.com', '7a744431be530cb4e5cc211fce731253ef403bd52db98f5e67b79b1a4a6ddb94', 'Coder'),
('user2@vbc.com', '7a744431be530cb4e5cc211fce731253ef403bd52db98f5e67b79b1a4a6ddb94', 'Coder'),
('user3@vbc.com', '7a744431be530cb4e5cc211fce731253ef403bd52db98f5e67b79b1a4a6ddb94', 'Coder')
ON CONFLICT (email) DO NOTHING;

-- Create test_people table for schema accessibility verification
CREATE TABLE IF NOT EXISTS mra_vbc_opps.test_people (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  gender VARCHAR(10),
  country VARCHAR(255),
  date_of_birth DATE
);

INSERT INTO mra_vbc_opps.test_people (name, gender, country, date_of_birth) VALUES
('John Doe', 'Male', 'USA', '1980-01-15'),
('Jane Smith', 'Female', 'USA', '1985-03-22'),
('Robert Johnson', 'Male', 'Canada', '1975-07-10'),
('Maria Garcia', 'Female', 'Mexico', '1990-11-05'),
('David Chen', 'Male', 'USA', '1982-05-18'),
('Sarah Williams', 'Female', 'UK', '1988-09-30'),
('Michael Brown', 'Male', 'USA', '1978-12-25'),
('Emily Davis', 'Female', 'Australia', '1992-04-12'),
('James Wilson', 'Male', 'USA', '1986-06-08'),
('Lisa Anderson', 'Female', 'USA', '1981-02-20')
ON CONFLICT DO NOTHING;
