'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuthToken } from '@/utils/api';

interface Opportunity {
  id: number;
  provider_name: string;
  payer_name: string;
  payer_id: number;
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
  history: HistoryEntry[];
}

interface HistoryEntry {
  id: number;
  old_status: string;
  new_status: string;
  changed_by_email: string;
  changed_at: string;
  justification_note: string;
}

interface Member {
  id: number;
  member_id: string;
  member_name: string;
}

export default function MemberReviewPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.memberId as string;

  const [member, setMember] = useState<Member | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedAccordions, setExpandedAccordions] = useState<Set<number>>(new Set());
  const [updatingOppId, setUpdatingOppId] = useState<number | null>(null);
  const [selectedOpportunities, setSelectedOpportunities] = useState<Set<number>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkNote, setBulkNote] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  useEffect(() => {
    fetchMemberOpportunities();
  }, [memberId]);

  useEffect(() => {
    // Scroll to top whenever opportunities load, but wait for paint
    if (opportunities.length > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
        });
      });
    }
  }, [opportunities]);

  const fetchMemberOpportunities = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      if (!token) {
        setError('Failed to authenticate');
        return;
      }

      const response = await fetch(`/api/mra-vbc-opps/members/${memberId}/opportunities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load member opportunities');
        return;
      }

      setMember(data.member);
      setOpportunities(data.opportunities);
      // Auto-expand all opportunities
      if (data.opportunities.length > 0) {
        setExpandedAccordions(new Set(data.opportunities.map((opp) => opp.id)));
      }
    } catch (err) {
      setError('Failed to fetch member opportunities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccordion = (oppId: number) => {
    const newExpanded = new Set(expandedAccordions);
    if (newExpanded.has(oppId)) {
      newExpanded.delete(oppId);
    } else {
      newExpanded.add(oppId);
    }
    setExpandedAccordions(newExpanded);
  };

  const handleUpdateDisposition = async (oppId: number, newStatus: string, newNote: string) => {
    if (!newStatus) return;

    try {
      setUpdatingOppId(oppId);
      const token = getAuthToken();
      
      if (!token) {
        setError('Failed to authenticate');
        return;
      }

      const response = await fetch(`/api/mra-vbc-opps/opportunities/${oppId}/disposition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          disposition_status: newStatus,
          justification_note: newNote || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update disposition');
        return;
      }

      // Refresh data
      await fetchMemberOpportunities();
    } catch (err) {
      setError('Failed to update disposition');
      console.error(err);
    } finally {
      setUpdatingOppId(null);
    }
  };

  const toggleOpportunitySelection = (oppId: number) => {
    const newSelected = new Set(selectedOpportunities);
    if (newSelected.has(oppId)) {
      newSelected.delete(oppId);
    } else {
      newSelected.add(oppId);
    }
    setSelectedOpportunities(newSelected);
  };

  const toggleSelectAllOpportunities = () => {
    if (selectedOpportunities.size === opportunities.length) {
      setSelectedOpportunities(new Set());
    } else {
      setSelectedOpportunities(new Set(opportunities.map((opp) => opp.id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedOpportunities.size === 0) return;

    try {
      setBulkUpdating(true);
      const token = getAuthToken();
      
      if (!token) {
        setError('Failed to authenticate');
        return;
      }

      const response = await fetch(`/api/mra-vbc-opps/opportunities/bulk/disposition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          opportunity_ids: Array.from(selectedOpportunities),
          disposition_status: bulkStatus,
          justification_note: bulkNote || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update dispositions');
        return;
      }

      // Reset modal and selections
      setShowBulkModal(false);
      setSelectedOpportunities(new Set());
      setBulkStatus('');
      setBulkNote('');

      // Refresh data
      await fetchMemberOpportunities();
    } catch (err) {
      setError('Failed to update dispositions');
      console.error(err);
    } finally {
      setBulkUpdating(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading member opportunities...</div>;
  }

  if (!member) {
    return (
      <div style={{ padding: '20px' }}>
        <p>{error || 'Member not found'}</p>
        <button onClick={() => router.back()}>Back to Work Queue</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <button
        onClick={() => router.back()}
        style={{
          padding: '8px 16px',
          marginBottom: '20px',
          backgroundColor: '#f0f0f0',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        ← Back to Work Queue
      </button>

      {error && (
        <div style={{ color: '#d32f2f', padding: '12px', backgroundColor: '#ffebee', marginBottom: '20px', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {/* Member Header */}
      <div style={{ backgroundColor: 'antiquewhite', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>
          {member.member_name}
        </h1>
        <div style={{ color: '#666', fontSize: '14px' }}>
          Member ID: {member.member_id} | Total Opportunities: {opportunities.length}
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {opportunities.length > 0 && (
        <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <input
            type="checkbox"
            checked={selectedOpportunities.size === opportunities.length && opportunities.length > 0}
            onChange={toggleSelectAllOpportunities}
            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
          />
          <span style={{ fontSize: '14px', color: '#666' }}>
            {selectedOpportunities.size > 0 ? `${selectedOpportunities.size} selected` : 'Select opportunities to update'}
          </span>
          <button
            onClick={() => setShowBulkModal(true)}
            disabled={selectedOpportunities.size === 0 || bulkUpdating}
            style={{
              padding: '8px 16px',
              marginLeft: 'auto',
              backgroundColor: selectedOpportunities.size > 0 ? '#1976d2' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedOpportunities.size > 0 ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
            onMouseEnter={(e) => selectedOpportunities.size > 0 && (e.currentTarget.style.backgroundColor = '#1565c0')}
            onMouseLeave={(e) => selectedOpportunities.size > 0 && (e.currentTarget.style.backgroundColor = '#1976d2')}
          >
            {bulkUpdating ? 'Updating...' : `Update Selected (${selectedOpportunities.size})`}
          </button>
        </div>
      )}

      {/* Opportunities as Accordions */}
      <div>
        {opportunities.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic', padding: '20px' }}>No opportunities found for this member.</p>
        ) : (
          opportunities.map((opp, index) => (
            <OpportunityAccordion
              key={opp.id}
              opportunity={opp}
              index={index}
              isExpanded={expandedAccordions.has(opp.id)}
              onToggle={() => toggleAccordion(opp.id)}
              onUpdate={handleUpdateDisposition}
              isUpdating={updatingOppId === opp.id}
              isSelected={selectedOpportunities.has(opp.id)}
              onSelect={() => toggleOpportunitySelection(opp.id)}
            />
          ))
        )}
      </div>

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}>
            <h2 style={{ margin: '0 0 20px 0' }}>Update {selectedOpportunities.size} Opportunities</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Status
              </label>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">— Select Status —</option>
                <option value="Open">Open</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Denied">Denied</option>
                <option value="Pending Chart">Pending Chart</option>
                <option value="Referred to Provider">Referred to Provider</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Note (Optional)
              </label>
              <textarea
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                placeholder="Add a note for this disposition..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  minHeight: '100px',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowBulkModal(false)}
                disabled={bulkUpdating}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={!bulkStatus || bulkUpdating}
                style={{
                  padding: '10px 20px',
                  backgroundColor: bulkStatus ? '#1976d2' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: bulkStatus ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
                onMouseEnter={(e) => bulkStatus && (e.currentTarget.style.backgroundColor = '#1565c0')}
                onMouseLeave={(e) => bulkStatus && (e.currentTarget.style.backgroundColor = '#1976d2')}
              >
                {bulkUpdating ? 'Applying...' : 'Apply to All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface OpportunityAccordionProps {
  opportunity: Opportunity;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (oppId: number, newStatus: string, newNote: string) => Promise<void>;
  isUpdating: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

function OpportunityAccordion({
  opportunity,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  isUpdating,
  isSelected,
  onSelect,
}: OpportunityAccordionProps) {
  const [newStatus, setNewStatus] = useState(opportunity.disposition_status);
  const [newNote, setNewNote] = useState('');

  return (
    <div
      style={{
        marginBottom: '12px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'white',
      }}
    >
      {/* Accordion Header */}
      <div
        style={{
          width: '100%',
          padding: '16px 20px',
          backgroundColor: '#f5f5f5',
          border: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          textAlign: 'left',
          gap: '12px',
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'pointer', width: '18px', height: '18px', flexShrink: 0 }}
        />
        <button
          onClick={onToggle}
          style={{
            flex: 1,
            padding: '0',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            textAlign: 'left',
            gap: '12px',
          }}
        >
          <span>
            #{index + 1} • {opportunity.hcc_code} ({opportunity.icd_10}) • {opportunity.payer_name} •{' '}
            <span style={{ color: '#1976d2' }}>{opportunity.disposition_status}</span>
          </span>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>{isExpanded ? '▼' : '▶'}</span>
        </button>
      </div>

      {/* Accordion Content */}
      {isExpanded && (
        <div style={{ padding: '20px', borderTop: '1px solid #eee' }}>
          {/* Opportunity Details */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Details</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                fontSize: '13px',
              }}
            >
              <div>
                <strong>Provider:</strong> {opportunity.provider_name}
              </div>
              <div>
                <strong>Payer:</strong> {opportunity.payer_name}
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
                <strong>Initiative:</strong> {opportunity.initiative}
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
          <div style={{ backgroundColor: '#fff3e0', padding: '16px', borderRadius: '6px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Update Disposition</h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              >
                <option value="Open">Open</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Denied">Denied</option>
                <option value="Pending Chart">Pending Chart</option>
                <option value="Referred to Provider">Referred to Provider</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                Justification Note
              </label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add your justification..."
                style={{
                  width: '100%',
                  padding: '8px',
                  minHeight: '60px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            <button
              onClick={() => onUpdate(opportunity.id, newStatus, newNote)}
              disabled={isUpdating || newStatus === opportunity.disposition_status}
              style={{
                padding: '8px 16px',
                backgroundColor: isUpdating || newStatus === opportunity.disposition_status ? '#ccc' : '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isUpdating || newStatus === opportunity.disposition_status ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              {isUpdating ? 'Updating...' : 'Update Disposition'}
            </button>
          </div>

          {/* Disposition History */}
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Disposition History</h3>

            {opportunity.history.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', fontSize: '13px' }}>No history yet.</p>
            ) : (
              <div>
                {opportunity.history.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      backgroundColor: '#f9f9f9',
                      border: '1px solid #eee',
                      borderRadius: '4px',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div>
                        <strong>
                          {entry.old_status ? `${entry.old_status} → ` : ''}
                          <span style={{ color: '#1976d2' }}>{entry.new_status}</span>
                        </strong>
                      </div>
                      <div style={{ color: '#666' }}>
                        {new Date(entry.changed_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ color: '#666', marginBottom: '6px' }}>
                      By: <strong>{entry.changed_by_email}</strong>
                    </div>
                    {entry.justification_note && (
                      <div style={{ color: '#333', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}>
                        <strong>Note:</strong> {entry.justification_note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
