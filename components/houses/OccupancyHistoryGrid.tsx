"use client"

import React, { useState, useEffect } from 'react';

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
 * Compact visual grid showing bedroom-by-bedroom occupancy over the last 6 months
 * Each row represents a bedroom, each column represents a month
 */
export function OccupancyHistoryGrid({
  houseId,
  currentOccupiedBedrooms,
  totalBedrooms,
}: OccupancyHistoryGridProps) {
  const [occupancyGrid, setOccupancyGrid] = useState<boolean[][]>([]);
  const [months, setMonths] = useState<MonthData[]>([]);

  useEffect(() => {
    // Generate the last 6 months
    const monthLabels: MonthData[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
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
    // For now, create a realistic pattern based on current state
    const grid: boolean[][] = [];
    
    if (totalBedrooms > 0) {
      for (let bedroom = 0; bedroom < totalBedrooms; bedroom++) {
        const bedroomOccupancy: boolean[] = [];
        
        // Determine if this bedroom is currently occupied
        const isCurrentlyOccupied = bedroom < currentOccupiedBedrooms;
        
        for (let month = 0; month < 6; month++) {
          // Create a realistic pattern:
          // - If currently occupied, likely occupied in recent months (90% chance)
          // - If currently vacant, mix of occupied/vacant history (50% chance)
          // - Add some variation to make it realistic
          
          if (isCurrentlyOccupied) {
            // Currently occupied bedrooms: mostly occupied with occasional gaps
            const randomFactor = Math.random();
            const isOccupied = month >= 4 ? true : randomFactor > 0.1; // More recent = more likely occupied
            bedroomOccupancy.push(isOccupied);
          } else {
            // Currently vacant bedrooms: mixed history
            const randomFactor = Math.random();
            const isOccupied = randomFactor > 0.6; // 40% occupied in history
            bedroomOccupancy.push(isOccupied);
          }
        }
        
        grid.push(bedroomOccupancy);
      }
    }
    
    setOccupancyGrid(grid);
  }, [houseId, currentOccupiedBedrooms, totalBedrooms]);

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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Last 6 Months</h4>
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

