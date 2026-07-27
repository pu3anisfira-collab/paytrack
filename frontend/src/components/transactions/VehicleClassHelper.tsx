import { useState } from 'react';
import { Info, Sparkles, HelpCircle } from 'lucide-react';
import { VEHICLE_CLASSES, type VehicleClassConfig } from '@/config/vehicleClasses';
import { Dialog } from '@/components/ui/Dialog';

interface Props {
  selectedClass: VehicleClassConfig;
}

export function VehicleClassHelper({ selectedClass }: Props) {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* ── HELPER CARD ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#2F6BFF]/30 bg-white p-3.5 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#0F234F]">
            <Sparkles size={14} className="text-[#2F6BFF]" />
            <span>{selectedClass.name}</span>
          </div>
          <span className="rounded-full bg-[#2F6BFF]/15 px-2.5 py-0.5 text-xs font-extrabold text-[#1E52D8]">
            RM {selectedClass.rateRm.toFixed(2)}/km
          </span>
        </div>

        {/* Examples List */}
        <p className="text-xs text-[#5F6C7B]">
          <span className="font-semibold text-[#0F234F]">💡 Examples: </span>
          {selectedClass.examples.join(', ')}
        </p>

        {/* Verify link */}
        <div className="flex items-center justify-between border-t border-[#D8E0EA]/60 pt-2 text-[11px]">
          <span className="text-[#5F6C7B]">Engine Capacity: <strong className="text-[#0F234F]">{selectedClass.engineCapacity}</strong></span>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="flex items-center gap-1 font-semibold text-[#2F6BFF] hover:underline"
          >
            <HelpCircle size={12} /> Verify Your Class
          </button>
        </div>
      </div>

      {/* ── VERIFY CLASS MODAL ─────────────────────────────────────────── */}
      <Dialog open={guideOpen} onClose={() => setGuideOpen(false)} title="Malaysian Mileage Claim Rates Guide">
        <div className="space-y-4 text-xs text-[#0F234F]">
          <p className="text-[#5F6C7B]">
            Mileage claims in Malaysia follow standard engine capacity classifications. Please select the class corresponding to your vehicle's grant or registration document.
          </p>

          <div className="overflow-x-auto rounded-xl border border-[#D8E0EA]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#0F234F] text-white font-bold">
                  <th className="p-2.5">Class</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Engine Capacity</th>
                  <th className="p-2.5 text-right">Rate (RM/km)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EA]">
                {VEHICLE_CLASSES.map((c) => (
                  <tr
                    key={c.id}
                    className={c.id === selectedClass.id ? 'bg-[#2F6BFF]/10 font-bold' : 'hover:bg-gray-50'}
                  >
                    <td className="p-2.5 font-bold">{c.code}</td>
                    <td className="p-2.5 capitalize">{c.category}</td>
                    <td className="p-2.5">{c.engineCapacity}</td>
                    <td className="p-2.5 text-right font-extrabold text-[#2F6BFF]">
                      RM {c.rateRm.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-[11px] text-blue-900 flex items-start gap-2">
            <Info size={14} className="mt-0.5 shrink-0 text-[#2F6BFF]" />
            <span>
              <strong>Note:</strong> If staff use a vehicle registered under their spouse or immediate family member for official station duties, claim rates apply based on the vehicle's engine capacity class.
            </span>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
