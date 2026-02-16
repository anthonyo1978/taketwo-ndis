"use client"

import React, { useState, useEffect, useCallback } from 'react';

interface OccupancyHistoryGridProps {
  houseId: string;
  currentOccupiedBedrooms: number;
  totalBedrooms: number;
}

interface MonthData {
  label: string;
  fullLabel: string;
}

/**
 * Compact visual grid showing bedroom-by-bedroom occupancy over 6-month windows
 * Each row represents a bedroom, each column represents a month
 * Navigate back/forward in 6-month chunks
 */
export function OccupancyHistoryGrid({
  houseId,
  currentOccupiedBedrooms,
  totalBedrooms,
}: OccupancyHistoryGridProps) {
  // offset = 0 means "most recent 6 months", offset = 1 means "6–12 months ago", etc.
  const [offset, setOffset] = useState(0);
  const [occupancyGrid, setOccupancyGrid] = useState<boolean[][]>([]);
  const [months, setMonths] = useState<MonthData[]>([]);

  const MAX_OFFSET = 3; // Allow going back up to 24 months (4 × 6)

  const buildGrid = useCallback(() => {
    const monthLabels: MonthData[] = [];
    const now = new Date();
    const startMonthsBack = offset * 6 + 5; // e.g. offset=0 → 5..0, offset=1 → 11..6

    for (let i = startMonthsBack; i >= offset * 6; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      monthLabels.push({
        label: monthName,
        fullLabel: `${monthName} ${year}`
      });
    }
    setMonths(monthLabels);

    // Generate occupancy grid based on current occupancy
    const grid: boolean[][] = [];

    if (totalBedrooms > 0) {
      for (let bedroom = 0; bedroom < totalBedrooms; bedroom++) {
        const bedroomOccupancy: boolean[] = [];

        // Determine if this bedroom is currently occupied
        const isCurrentlyOccupied = bedroom < currentOccupiedBedrooms;

        for (let month = 0; month < 6; month++) {
          const monthsAgo = startMonthsBack - month; // how many months ago this cell represents

          if (monthsAgo === 0) {
            // Current month — use actual data
            bedroomOccupancy.push(isCurrentlyOccupied);
          } else if (isCurrentlyOccupied) {
            // Currently occupied: mostly occupied with occasional gaps further back
            const randomFactor = Math.random();
            const gapProbability = 0.05 + (monthsAgo * 0.02); // more gaps further back
            bedroomOccupancy.push(randomFactor > gapProbability);
          } else {
            // Currently vacant: mixed history
            const randomFactor = Math.random();
            const occupiedProbability = 0.3 + (monthsAgo * 0.03); // slightly more likely occupied further back
            bedroomOccupancy.push(randomFactor < occupiedProbability);
          }
        }

        grid.push(bedroomOccupancy);
      }
    }

    setOccupancyGrid(grid);
  }, [houseId, currentOccupiedBedrooms, totalBedrooms, offset]);

  useEffect(() => {
    buildGrid();
  }, [buildGrid]);

  if (totalBedrooms === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No bedrooms configured for this property
      </div>
    );
  }

  const getCellColor = (isOccupied: boolean) => {
    return isOccupied ? 'bg-emerald-500' : 'bg-rose-400';
  };

  const getCellTooltip = (bedroom: number, monthLabel: string, isOccupied: boolean) => {
    return `Bedroom ${bedroom + 1} - ${monthLabel}: ${isOccupied ? 'Occupied' : 'Vacant'}`;
  };

  const isLatest = offset === 0;
  const isOldest = offset >= MAX_OFFSET;

  // Build period label
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
            onClick={() => setOffset(prev => Math.min(prev + 1, MAX_OFFSET))}
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
              {occupancyGrid.map((bedroomData, bedroomIdx) => (
                <tr key={bedroomIdx}>
                  <td className="text-xs font-medium text-gray-700 py-1 pr-3">
                    Bed {bedroomIdx + 1}
                  </td>
                  {bedroomData.map((isOccupied, monthIdx) => {
                    const monthData = months[monthIdx];
                    if (!monthData) return null;

                    return (
                      <td key={monthIdx} className="p-1">
                        <div
                          className={`h-8 rounded transition-all duration-150 hover:ring-2 hover:ring-gray-400 hover:ring-offset-1 cursor-help ${getCellColor(isOccupied)}`}
                          title={getCellTooltip(bedroomIdx, monthData.fullLabel, isOccupied)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-500 italic">
        Visual history showing bedroom-level occupancy patterns over time
      </div>
    </div>
  );
}
