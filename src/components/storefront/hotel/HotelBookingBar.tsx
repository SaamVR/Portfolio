"use client";

import { CalendarDays, Search, Users } from "lucide-react";

export function HotelBookingBar({
  checkIn,
  checkOut,
  guests,
  rooms,
  onCheckInChange,
  onCheckOutChange,
  onGuestsChange,
  onRoomsChange,
  onSubmit,
}: {
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  onGuestsChange: (value: number) => void;
  onRoomsChange: (value: number) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-[#dfe8e1] bg-white p-3 shadow-[0_22px_48px_-34px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-card">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="flex items-center gap-3 rounded-[20px] border border-[#e6ede8] px-4 py-3 dark:border-white/10">
          <CalendarDays className="h-4.5 w-4.5 text-[#285c46]" />
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Check-in</span>
            <input
              type="date"
              value={checkIn}
              onChange={(event) => onCheckInChange(event.target.value)}
              className="mt-1 w-full bg-transparent text-sm font-medium text-slate-900 outline-none dark:text-foreground"
            />
          </div>
        </label>

        <label className="flex items-center gap-3 rounded-[20px] border border-[#e6ede8] px-4 py-3 dark:border-white/10">
          <CalendarDays className="h-4.5 w-4.5 text-[#285c46]" />
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Check-out</span>
            <input
              type="date"
              value={checkOut}
              onChange={(event) => onCheckOutChange(event.target.value)}
              className="mt-1 w-full bg-transparent text-sm font-medium text-slate-900 outline-none dark:text-foreground"
            />
          </div>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-3 rounded-[20px] border border-[#e6ede8] px-4 py-3 dark:border-white/10">
            <Users className="h-4.5 w-4.5 text-[#285c46]" />
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Guests</span>
              <select
                value={guests}
                onChange={(event) => onGuestsChange(Number(event.target.value))}
                className="mt-1 w-full bg-transparent text-sm font-medium text-slate-900 outline-none dark:text-foreground"
              >
                {[1, 2, 3, 4, 5, 6].map((value) => (
                  <option key={value} value={value}>{value} Guest{value > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-[20px] border border-[#e6ede8] px-4 py-3 dark:border-white/10">
            <Users className="h-4.5 w-4.5 text-[#285c46]" />
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Rooms</span>
              <select
                value={rooms}
                onChange={(event) => onRoomsChange(Number(event.target.value))}
                className="mt-1 w-full bg-transparent text-sm font-medium text-slate-900 outline-none dark:text-foreground"
              >
                {[1, 2, 3, 4].map((value) => (
                  <option key={value} value={value}>{value} Room{value > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
          </label>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          className="inline-flex h-full min-h-14 items-center justify-center gap-2 rounded-[20px] bg-[#285c46] px-6 text-sm font-semibold text-white shadow-[0_18px_32px_-18px_rgba(40,92,70,0.55)] transition-transform hover:-translate-y-0.5"
        >
          <Search className="h-4 w-4" />
          Check Availability
        </button>
      </div>
    </div>
  );
}
