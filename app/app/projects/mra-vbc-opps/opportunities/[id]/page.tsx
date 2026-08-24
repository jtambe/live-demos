'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface OpportunityDetail {
  id: number;
  member_id: string;
  member_name: string;
  provider_id: number;
  provider_name: string;
  payer_id: number;
  payer_name: string;
  icd_10: string;
  icd_10_description: string;
  hcc_code: string;
  hcc_description: string;
  initiative: string;
  evidence: string;
  last_dos: string;
  disposition_status: string;
  disposition_note: string;
  disposition_changed_at: string;
  created_at: string;
}

interface HistoryEntry {
  id: number;
  old_status: string;
  new_status: string;
  changed_by_email: string;
  changed_at: string;
  justification_note: string;
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const opportunityId = params.id as string;

  const [opportunity, setOpportunity] = useState<OpportunityDetail | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newDisposition, setNewDisposition] = useState('');
  const [newNote, setNewNote] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOpportunityDetail();
  }, [opportunityId]);

  const fetchOpportunityDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/mra-vbc-opps/opportunities/${opportunityId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load opportunity');
        return;
      }

      setOpportunity(data.opportunity);
      setHistory(data.history || []);
      setNewDisposition(data.opportunity.disposition_status);
    } catch (err) {
      setError('Failed to fetch opportunity details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDisposition = async () => {
    if (!newDisposition) {
      setError('Please select a disposition status');
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`/api/mra-vbc-opps/opportunities/${opportunityId}/disposition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposition_status: newDisposition,
          justification_note: newNote || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update disposition');
        return;
      }

      // Refresh the page
      await fetchOpportunityDetail();
      setNewNote('');
    } catch (err) {
      setError('Failed to update disposition');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading opportunity details...</div>;
  }

  if (!opportunity) {
    return (
      <div style={{ padding: '20px' }}>
        <p>{error || 'Opportunity not found'}</p>
        <button onClick={() => router.back()}>Back to Work Queue</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <button
        onClick={() => router.back()}
        style={{
          padding: '8px 16px',
          marginBottom: '20px',
          backgroundColor: '#f0f0f0',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        ← Back to Work Queue
      </button>

      {error && (
        <div style={{ color: '#d32f2f', padding: '12px', backgroundColor: '#ffebee', marginBottom: '20px', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {/* Opportunity Details Section */}
      <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ marginTop: 0 }}>Opportunity Details</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <div>
            <strong>Member:</strong> {opportunity.member_name} ({opportunity.member_id})
          </div>
          <div>
            <strong>Provider:</strong> {opportunity.provider_name}
          </div>
          <div>
            <strong>Payer:</strong> {opportunity.payer_name}
          </div>
          <div>
            <strong>Initiative:</strong> {opportunity.initiative}
          </div>
          <div>
            <strong>ICD-10:</strong> {opportunity.icd_10}
          </div>
          <div>
            <strong>ICD-10 Description:</strong> {opportunity.icd_10_description}
          </div>
          <div>
            <strong>HCC Code:</strong> {opportunity.hcc_code}
          </div>
          <div>
            <strong>HCC Description:</strong> {opportunity.hcc_description}
          </div>
          <div>
            <strong>Evidence:</strong> {opportunity.evidence || 'N/A'}
          </div>
          <div>
            <strong>Last DOS:</strong> {opportunity.last_dos || 'N/A'}
          </div>
        </div>
      </div>

      {/* Disposition Update Section */}
      <div style={{ backgroundColor: '#fff3e0', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Update Disposition</h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Current Status: <span style={{ color: '#1976d2' }}>{opportunity.disposition_status}</span>
          </label>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>New Status:</label>
          <select
            value={newDisposition}
            onChange={(e) => setNewDisposition(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            <option value="">Select a disposition...</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Denied">Denied</option>
            <option value="Pending Chart">Pending Chart</option>
            <option value="Referred to Provider">Referred to Provider</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Justification Note:</label>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Enter your justification for this disposition..."
            style={{
              width: '100%',
              padding: '8px',
              minHeight: '80px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <button
          onClick={handleUpdateDisposition}
          disabled={updating || !newDisposition}
          style={{
            padding: '10px 20px',
            backgroundColor: updating ? '#ccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: updating ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          {updating ? 'Updating...' : 'Update Disposition'}
        </button>
      </div>

      {/* Disposition History Section */}
      <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0 }}>Disposition History</h3>

        {history.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No disposition history yet.</p>
        ) : (
          <div>
            {history.map((entry, index) => (
              <div
                key={entry.id}
                style={{
                  padding: '12px',
                  marginBottom: '12px',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <strong>
                      {entry.old_status ? `${entry.old_status} → ` : ''}
                      <span style={{ color: '#1976d2' }}>{entry.new_status}</span>
                    </strong>
                  </div>
                  <div style={{ color: '#666', fontSize: '13px' }}>
                    {new Date(entry.changed_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ marginBottom: '8px', color: '#666', fontSize: '13px' }}>
                  Changed by: <strong>{entry.changed_by_email}</strong>
                </div>
                {entry.justification_note && (
                  <div style={{ color: '#333', fontSize: '13px', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                    <strong>Note:</strong> {entry.justification_note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
