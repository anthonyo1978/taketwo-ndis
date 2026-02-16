"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface ResidentInfo {
  id: string;
  firstName: string;
  lastName: string;
  moveInDate?: Date | string | null;
  roomLabel?: string;
}

interface OccupancyHistoryGridProps {
  houseId: string;
  currentOccupiedBedrooms: number;
  totalBedrooms: number;
  residents?: ResidentInfo[];
  goLiveDate?: Date | string | null;
}

interface MonthData {
  label: string;
  fullLabel: string;
  date: Date; // first day of that month
}

/**
 * Compact visual grid showing bedroom-by-bedroom occupancy over 6-month windows.
 * Uses real move-in dates from residents when available.
 * Pagination is bounded by the house go-live date.
 */
export function OccupancyHistoryGrid({
  houseId,
  currentOccupiedBedrooms,
  totalBedrooms,
  residents = [],
  goLiveDate,
}: OccupancyHistoryGridProps) {
  const [offset, setOffset] = useState(0);

  // Parse go-live date
  const goLive = useMemo(() => {
    if (!goLiveDate) return null;
    const d = new Date(goLiveDate);
    return isNaN(d.getTime()) ? null : d;
  }, [goLiveDate]);

  // Calculate max offset based on go-live date
  const maxOffset = useMemo(() => {
    if (!goLive) return 3; // default fallback: 24 months
    const now = new Date();
    const monthsDiff =
      (now.getFullYear() - goLive.getFullYear()) * 12 +
      (now.getMonth() - goLive.getMonth());
    // We want to allow going back to 1 month before go-live
    const totalMonthsBack = monthsDiff + 1;
    // Each page is 6 months, so max offset is ceil(totalMonthsBack / 6) - 1
    return Math.max(0, Math.ceil(totalMonthsBack / 6) - 1);
  }, [goLive]);

  // Parse residents' move-in dates
  const residentMoveIns = useMemo(() => {
    return residents
      .filter(r => r.moveInDate)
      .map(r => ({
        ...r,
        moveIn: new Date(r.moveInDate!),
      }))
      .sort((a, b) => a.moveIn.getTime() - b.moveIn.getTime());
  }, [residents]);

  // Build months for the current window
  const months = useMemo(() => {
    const now = new Date();
    const result: MonthData[] = [];
    const startMonthsBack = offset * 6 + 5;

    for (let i = startMonthsBack; i >= offset * 6; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      result.push({
        label: monthName,
        fullLabel: `${monthName} ${year}`,
        date,
      });
    }
    return result;
  }, [offset]);

  // Build the occupancy grid using real move-in dates
  const occupancyGrid = useMemo(() => {
    const grid: { isOccupied: boolean; residentName?: string; isPreGoLive?: boolean }[][] = [];

    if (totalBedrooms === 0) return grid;

    // Sort residents by move-in date (earliest first) for bed assignment
    const sortedResidents = [...residentMoveIns];

    for (let bedroom = 0; bedroom < totalBedrooms; bedroom++) {
      const bedroomRow: { isOccupied: boolean; residentName?: string; isPreGoLive?: boolean }[] = [];
      // Assign resident to this bedroom slot (by order of move-in)
      const assignedResident = sortedResidents[bedroom] || null;

      for (const month of months) {
        const monthStart = month.date;
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

        // Check if this month is before go-live
        const isPreGoLive = goLive ? monthEnd < goLive : false;

        if (assignedResident) {
          // Resident is assigned to this bed — occupied if month >= move-in month
          const moveInMonth = new Date(
            assignedResident.moveIn.getFullYear(),
            assignedResident.moveIn.getMonth(),
            1
          );
          const isOccupied = monthStart >= moveInMonth;
          bedroomRow.push({
            isOccupied,
            residentName: isOccupied
              ? `${assignedResident.firstName} ${assignedResident.lastName}`
              : undefined,
            isPreGoLive,
          });
        } else {
          // No resident for this bed — vacant
          bedroomRow.push({
            isOccupied: false,
            isPreGoLive,
          });
        }
      }

      grid.push(bedroomRow);
    }

    return grid;
  }, [totalBedrooms, residentMoveIns, months, goLive]);

  if (totalBedrooms === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No bedrooms configured for this property
      </div>
    );
  }

  const getCellColor = (cell: { isOccupied: boolean; isPreGoLive?: boolean }) => {
    if (cell.isPreGoLive) return 'bg-gray-200'; // Pre go-live: neutral
    return cell.isOccupied ? 'bg-emerald-500' : 'bg-rose-400';
  };

  const getCellTooltip = (
    bedroom: number,
    monthLabel: string,
    cell: { isOccupied: boolean; residentName?: string; isPreGoLive?: boolean }
  ) => {
    if (cell.isPreGoLive) return `Bed ${bedroom + 1} - ${monthLabel}: Pre go-live`;
    if (cell.isOccupied && cell.residentName) {
      return `Bed ${bedroom + 1} - ${monthLabel}: ${cell.residentName}`;
    }
    return `Bed ${bedroom + 1} - ${monthLabel}: ${cell.isOccupied ? 'Occupied' : 'Vacant'}`;
  };

  const isLatest = offset === 0;
  const isOldest = offset >= maxOffset;

  // Period label
  const periodLabel = (() => {
    if (months.length < 2) return '';
    return `${months[0]?.fullLabel} – ${months[months.length - 1]?.fullLabel}`;
  })();

  return (
    <div className="space-y-3">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset(prev => Math.min(prev + 1, maxOffset))}
            disabled={isOldest}
            className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous 6 months"
          >
            <svg className="size-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h4 className="text-sm font-medium text-gray-700 select-none">{periodLabel}</h4>
          <button
            onClick={() => setOffset(prev => Math.max(prev - 1, 0))}
            disabled={isLatest}
            className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next 6 months"
          >
            <svg className="size-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            Occupied
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-400"></span>
            Vacant
          </span>
          {goLive && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-gray-200"></span>
              Pre go-live
            </span>
          )}
        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-xs font-medium text-gray-600 text-left pb-2 pr-3 w-20">
                  Bedroom
                </th>
                {months.map((month, idx) => (
                  <th
                    key={idx}
                    className="text-xs font-medium text-gray-600 text-center pb-2 px-1"
                    title={month.fullLabel}
                  >
                    {month.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {occupancyGrid.map((bedroomData, bedroomIdx) => {
                // Find resident assigned to this bed slot
                const assignedResident = residentMoveIns[bedroomIdx];
                const bedLabel = assignedResident
                  ? `${assignedResident.firstName.charAt(0)}${assignedResident.lastName.charAt(0)}`
                  : `Bed ${bedroomIdx + 1}`;

                return (
                  <tr key={bedroomIdx}>
                    <td className="text-xs font-medium text-gray-700 py-1 pr-3" title={assignedResident ? `${assignedResident.firstName} ${assignedResident.lastName}` : `Bedroom ${bedroomIdx + 1}`}>
                      <div className="flex items-center gap-1.5">
                        {assignedResident ? (
                          <>
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-[9px] font-bold text-blue-700 flex-shrink-0">
                              {bedLabel}
                            </span>
                            <span className="truncate max-w-[60px]">{assignedResident.firstName}</span>
                          </>
                        ) : (
                          <span>Bed {bedroomIdx + 1}</span>
                        )}
                      </div>
                    </td>
                    {bedroomData.map((cell, monthIdx) => {
                      const monthData = months[monthIdx];
                      if (!monthData) return null;

                      return (
                        <td key={monthIdx} className="p-1">
                          <div
                            className={`h-8 rounded transition-all duration-150 hover:ring-2 hover:ring-gray-400 hover:ring-offset-1 cursor-help ${getCellColor(cell)}`}
                            title={getCellTooltip(bedroomIdx, monthData.fullLabel, cell)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-500 italic flex items-center justify-between">
        <span>Occupancy based on resident move-in dates</span>
        {goLive && (
          <span>Go-live: {goLive.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        )}
      </div>
    </div>
  );
}
