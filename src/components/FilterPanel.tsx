/**
 * Filter panel with account-level and calendar-level toggles
 */

import { useState, useEffect } from 'react';
import { useEventFilters } from '../hooks/useEventFilters';

interface FilterPanelProps {
  onFilterChange?: () => void;
}

export default function FilterPanel({ onFilterChange }: FilterPanelProps) {
  const {
    accounts,
    calendars,
    filterState,
    toggleAccount,
    toggleCalendar,
    selectAll,
    deselectAll,
    loading,
  } = useEventFilters();

  // Track which accounts are expanded
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  // Notify parent when filters change
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange();
    }
  }, [filterState, onFilterChange]);

  const toggleExpandAccount = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  if (loading) {
    return (
      <div style={{ padding: '16px', color: '#6b7280' }}>
        Loading filters...
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
        No accounts connected. Add an account to see filters.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        minWidth: '280px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
          Filters
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={selectAll}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            title="Select all"
          >
            All
          </button>
          <button
            onClick={deselectAll}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            title="Deselect all"
          >
            None
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {accounts.map((account) => {
          const isAccountVisible = filterState.accounts.get(account.id) ?? true;
          const isExpanded = expandedAccounts.has(account.id);
          const accountCalendars = calendars.filter((cal) => cal.accountId === account.id);

          return (
            <div key={account.id} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
              {/* Account header with checkbox and expand/collapse */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                <input
                  type="checkbox"
                  checked={isAccountVisible}
                  onChange={() => toggleAccount(account.id)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                  }}
                />
                <button
                  onClick={() => toggleExpandAccount(account.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                    fontSize: '14px',
                    color: '#6b7280',
                  }}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: account.color || '#3b82f6',
                    borderRadius: '2px',
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                />
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    flex: 1,
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleExpandAccount(account.id)}
                >
                  {account.email}
                </span>
              </div>

              {/* Calendar list (collapsible) */}
              {isExpanded && (
                <div
                  style={{
                    marginLeft: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {accountCalendars.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
                      No calendars
                    </div>
                  ) : (
                    accountCalendars.map((calendar) => {
                      const isCalendarVisible = filterState.calendars.get(calendar.id) ?? true;
                      return (
                        <div
                          key={calendar.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isCalendarVisible}
                            onChange={() => toggleCalendar(calendar.id)}
                            style={{
                              width: '14px',
                              height: '14px',
                              cursor: 'pointer',
                            }}
                          />
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              backgroundColor: calendar.backgroundColor || calendar.color || '#9ca3af',
                              borderRadius: '2px',
                              border: '1px solid rgba(0,0,0,0.1)',
                            }}
                          />
                          <span
                            style={{
                              fontSize: '13px',
                              color: '#4b5563',
                            }}
                          >
                            {calendar.summary}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
