import React, { useState, useEffect, useRef } from "react";

import {
  SHARED_INPUT_STYLE,
  FLOATING_PANEL_STYLE,
  PANEL_ROW_STYLE,
  LABEL_STYLE,
  PANEL_HEADING_STYLE,
  SEVERITY_LABELS,
  PRIMARY_BUTTON_STYLE,
  OPTION_ROW_STYLE,
  SELECT_TRIGGER_STYLE,
} from "../styles/controls";
import { apiFetch, ApiError } from "../api";
import { panelCoords } from "../lib/floating";
import { CustomDatePicker } from "./CustomDatePicker";

const SeveritySegments: React.FC<{
  value: number;
  onChange: (val: number) => void;
}> = ({ value, onChange }) => {
  const levels = [1, 2, 3, 4, 5];
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Derive from the CURRENT value, not the pressed button's own level, and move
  // DOM focus to the newly selected segment. Without the focus move the same
  // button keeps receiving keydown, and selection never advances past one step.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    let next: number;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = Math.min(5, value + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = Math.max(1, value - 1);
        break;
      case "Home":
        next = 1;
        break;
      case "End":
        next = 5;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next === value) return;
    onChange(next);
    btnRefs.current[next - 1]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Severity Level" className="flex gap-1.5">
      {levels.map((level) => {
        const selected = value === level;
        return (
          <button
            key={level}
            ref={(el) => {
              btnRefs.current[level - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Level ${level} - ${SEVERITY_LABELS[level]}`}
            title={`Level ${level} - ${SEVERITY_LABELS[level]}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(level)}
            onKeyDown={handleKeyDown}
            className={`flex-1 min-h-[44px] rounded font-cond text-sm transition-all focus:outline-none focus:ring-2 focus:ring-amstar-red-edge/40 focus:border-amstar-red-edge ${
              selected
                ? "text-white border border-amstar-red-edge bg-amstar-red/[0.16]"
                : "text-amstar-ink-faint border border-amstar-line hover:border-amstar-red/60"
            }`}
          >
            {level}
          </button>
        );
      })}
    </div>
  );
};

// SERVICE PICKER
// Multi-select dropdown in the CustomDatePicker style. Tapping a service toggles
// it and the panel stays open, so several services can be picked in a row
// without typing commas to reopen the list.

// Tall enough for search + chips + ~6 rows + footer; the list scrolls past that.
const SERVICE_PANEL_HEIGHT = 360;

const splitServices = (csv: string) =>
  csv
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

const ServicePicker: React.FC<{
  value: string;
  onChange: (val: string) => void;
  historicalMap: Record<string, number>;
  onAutoSetSeverity: (severity: number) => void;
  /** Appended to the trigger, so the form can ring it red when it is blank. */
  className?: string;
}> = ({
  value,
  onChange,
  historicalMap,
  onAutoSetSeverity,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 0,
  });

  const selected = splitServices(value);
  const q = query.trim().toUpperCase();

  const catalog = Object.keys(historicalMap).sort();
  const matches = catalog.filter((s) => s.includes(q));
  const pickedRows = selected.filter((s) => s.includes(q));
  const otherRows = matches.filter((s) => !selected.includes(s));
  // Offer to add what was typed when it isn't already a catalog entry.
  const canAddTyped =
    q.length > 0 &&
    q.length <= 80 &&
    !catalog.includes(q) &&
    !selected.includes(q);

  const commit = (next: string[]) => {
    onChange(next.join(", "));
    // Severity follows the most severe known service on the ticket.
    const known = next
      .map((s) => historicalMap[s])
      .filter((n): n is number => typeof n === "number");
    if (known.length) onAutoSetSeverity(Math.max(...known));
  };

  const toggle = (service: string) => {
    commit(
      selected.includes(service)
        ? selected.filter((s) => s !== service)
        : [...selected, service],
    );
  };

  const addTyped = () => {
    if (!canAddTyped) return;
    commit([...selected, q]);
    setQuery("");
  };

  const handleOpen = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords(panelCoords(rect, SERVICE_PANEL_HEIGHT, 288));
    setQuery("");
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Autofocus the search box with a mouse, but not on touch: raising the iPad
  // keyboard the instant the panel opens would cover the list being tapped.
  const autoFocusSearch =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: fine)").matches;

  return (
    <div className="relative w-full">
      <div
        onClick={handleOpen}
        className={`${SELECT_TRIGGER_STYLE} flex items-center gap-2 ${className}`}
      >
        <span
          className={`truncate flex-1 ${selected.length ? "text-amstar-ink font-bold uppercase" : "text-amstar-ink-faint"}`}
        >
          {selected.length ? selected.join(", ") : "Select services..."}
        </span>
        {/*
        {selected.length > 1 && (
          <span className="shrink-0 px-1.5 py-0.5 rounded-sm bg-amstar-field border border-amstar-line text-[10px] font-mono tabular-nums text-amstar-ink-dim">
            {selected.length}
          </span>
        )}
        */}
        <span className="text-xs text-amstar-ink-faint shrink-0">▼</span>
      </div>

      {isOpen && (
        <>
          <div
            className="anim-fade fixed inset-0 z-[100]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            onWheel={() => setIsOpen(false)}
            onTouchMove={() => setIsOpen(false)}
          ></div>
          <div
            className={`${FLOATING_PANEL_STYLE} flex flex-col`}
            // Capped at the height panelCoords positioned it for, or a long catalog
            // grows the panel past the bottom of the screen.
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: Math.min(SERVICE_PANEL_HEIGHT, coords.maxHeight),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-amstar-line-soft">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  // Enter picks an exact match, or the only match left after
                  // filtering; otherwise it adds the typed name as a new service.
                  const pick = catalog.includes(q)
                    ? q
                    : matches.length === 1
                      ? matches[0]
                      : null;
                  if (pick) {
                    if (!selected.includes(pick)) toggle(pick);
                    setQuery("");
                  } else addTyped();
                }}
                autoFocus={autoFocusSearch}
                maxLength={80}
                placeholder="Search or type a new service"
                className={SHARED_INPUT_STYLE}
              />
            </div>

            <div className="overflow-y-auto min-h-0 flex-1 p-1">
              {canAddTyped && (
                <button
                  type="button"
                  onClick={addTyped}
                  className="w-full min-h-10 px-3 py-2 rounded-sm text-left text-xs font-bold text-amstar-red-ink uppercase hover:bg-amstar-surface transition-colors"
                >
                  + Add "{q}"
                </button>
              )}
              {[...pickedRows, ...otherRows].map((service, i) => {
                const isOn = selected.includes(service);
                const firstUnpicked =
                  i === pickedRows.length && pickedRows.length > 0;
                return (
                  <button
                    key={service}
                    type="button"
                    role="checkbox"
                    aria-checked={isOn}
                    onClick={() => toggle(service)}
                    className={`${OPTION_ROW_STYLE} ${isOn ? "bg-amstar-surface" : "hover:bg-amstar-surface"} ${firstUnpicked ? "mt-1 border-t border-amstar-line-soft rounded-t-none" : ""}`}
                  >
                    <span
                      className={`shrink-0 w-4 h-4 rounded-sm border grid place-items-center text-[10px] font-black ${isOn ? "bg-amstar-red border-amstar-red text-white" : "border-amstar-line"}`}
                    >
                      {isOn ? "✓" : ""}
                    </span>
                    <span className="flex-1 text-xs font-bold text-amstar-ink uppercase">
                      {service}
                    </span>
                  </button>
                );
              })}
              {pickedRows.length + otherRows.length === 0 && !canAddTyped && (
                <p className="px-3 py-3 text-xs text-amstar-ink-faint">
                  No matching services.
                </p>
              )}
            </div>

            <div className="p-2 border-t border-amstar-line-soft flex justify-between items-center">
              <span className="text-[11px] font-bold text-amstar-ink-faint px-1">
                {selected.length} selected
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`${PRIMARY_BUTTON_STYLE} min-h-9 px-4 py-1.5 text-xs`}
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const US_STATES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};

const StateSearch: React.FC<{
  value: string;
  onChange: (val: string) => void;
  /** Appended to the trigger, so the form can ring it red when it is blank. */
  className?: string;
}> = ({ value, onChange, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  useEffect(() => {
    setSearch(value);
  }, [value]);
  const filteredStates = Object.entries(US_STATES).filter(
    ([abbr, name]) =>
      abbr.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase()),
  );
  const handleSelect = (abbr: string) => {
    setSearch(abbr);
    onChange(abbr);
    setIsOpen(false);
  };
  const handleBlur = () => {
    setIsOpen(false);
    const cleanSearch = search.trim().toLowerCase();
    const exactMatch = Object.entries(US_STATES).find(
      ([abbr, name]) =>
        name.toLowerCase() === cleanSearch ||
        abbr.toLowerCase() === cleanSearch,
    );
    if (exactMatch) {
      setSearch(exactMatch[0]);
      onChange(exactMatch[0]);
    } else {
      const fallback = cleanSearch.substring(0, 2).toUpperCase();
      setSearch(fallback);
      onChange(fallback);
    }
  };
  const openDropdown = (
    e: React.FocusEvent<HTMLInputElement> | React.ChangeEvent<HTMLInputElement>,
  ) => {
    const rect = e.target.getBoundingClientRect();
    setCoords(panelCoords(rect, 192, 200));
    setIsOpen(true);
  };
  return (
    <div className="relative w-24 shrink-0">
      <label className={LABEL_STYLE}>State</label>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          openDropdown(e);
        }}
        onFocus={openDropdown}
        onBlur={handleBlur}
        placeholder="MD"
        className={`anim-fade ${SHARED_INPUT_STYLE} text-center font-bold uppercase tabular-nums ${className}`}
      />
      {isOpen && filteredStates.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            onWheel={() => setIsOpen(false)}
            onTouchMove={() => setIsOpen(false)}
          ></div>
          <div
            className={`${FLOATING_PANEL_STYLE} max-h-48 overflow-y-auto`}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            onClick={(e) => e.stopPropagation()}
          >
            {filteredStates.map(([abbr, name]) => (
              <div
                key={abbr}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(abbr);
                }}
                className={`${PANEL_ROW_STYLE} flex justify-between items-center`}
              >
                <span className="truncate">{name}</span>
                <span className="text-amstar-ink-dim ml-2 shrink-0">
                  {abbr}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const FormWorkerDropdown: React.FC<{
  currentWorkers: string;
  onAssign: (workers: string) => void;
  technicianNames: string[];
}> = ({ currentWorkers, onAssign, technicianNames }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const workersList = technicianNames;
  const selectedArray = currentWorkers
    ? currentWorkers
        .split(",")
        .map((w) => w.trim())
        .filter((w) => w !== "")
    : [];
  const handleToggle = (workerName: string) => {
    let updatedSelection = selectedArray.includes(workerName)
      ? selectedArray.filter((w) => w !== workerName)
      : [...selectedArray, workerName];
    onAssign(updatedSelection.join(", "));
  };
  const openDropdown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    // 256 stays the floor; a wider trigger now gets a panel to match.
    setCoords(panelCoords(rect, 226, 256));
    setIsOpen(true);
  };
  return (
    <>
      <div
        onClick={openDropdown}
        className={`${SELECT_TRIGGER_STYLE} flex justify-between items-center`}
      >
        <span
          className="truncate"
          title={
            selectedArray.length === 0
              ? "Select technicians..."
              : selectedArray.join(", ")
          }
        >
          {selectedArray.length === 0 ? (
            <span className="text-amstar-ink-faint">Select technicians...</span>
          ) : (
            selectedArray.join(", ")
          )}
        </span>
        <span className="anim-fade text-xs ml-2 text-amstar-ink-faint shrink-0">
          ▼
        </span>
      </div>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            onWheel={() => setIsOpen(false)}
            onTouchMove={() => setIsOpen(false)}
          ></div>
          <div
            className={FLOATING_PANEL_STYLE}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`${PANEL_HEADING_STYLE} bg-amstar-raised px-3 py-2 border-b border-amstar-line-soft text-[10px] font-black`}
            >
              Assign Technicians
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {workersList.map((worker) => {
                const isOn = selectedArray.includes(worker);
                return (
                  <button
                    key={worker}
                    type="button"
                    role="checkbox"
                    aria-checked={isOn}
                    onClick={() => handleToggle(worker)}
                    className={`${OPTION_ROW_STYLE} ${isOn ? "bg-amstar-surface" : "hover:bg-amstar-surface"}`}
                  >
                    <span
                      className={`shrink-0 w-4 h-4 rounded-sm border grid place-items-center
                      text-[10px] font-black ${isOn ? "bg-amstar-red border-amstar-red text-white" : "border-amstar-line"}`}
                    >
                      {isOn ? "✓" : ""}
                    </span>
                    <span className="flex-1 text-xs font-bold text-amstar-ink">
                      {worker}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
};

interface RepairFormProps {
  onSuccess: () => void;
  onClose: () => void;
  currentUser: string;
  isAdmin: boolean;
  historicalServiceMap: Record<string, number>;
  technicianNames: string[];
}

export const RepairForm: React.FC<RepairFormProps> = ({
  onSuccess,
  onClose,
  isAdmin,
  historicalServiceMap,
  technicianNames,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleState, setVehicleState] = useState("MD");
  const [serviceType, setServiceType] = useState("");
  const [severity, setSeverity] = useState<number>(3);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState("");
  const [assignedWorkers, setAssignedWorkers] = useState<string>("");
  const [vin, setVin] = useState("");

  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * A red ring on whichever controls were left blank. Takes the live value so
   * the ring clears the moment it is filled, rather than sitting there red
   * until the next submit.
   */
  const ringIfMissing = (field: string, value: string) =>
    missing.includes(field) && !value.trim() ? "ring-2 ring-amstar-red-edge" : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // The form is noValidate on purpose. Service, state and the due date are
    // hand-rolled controls whose real <input> sits at 0x0 and transparent, and
    // a browser cannot show a validation bubble on something invisible - it
    // silently refuses to submit and the shop sees nothing happen. Checking
    // here means the missing field gets named on screen instead.
    const required: Array<[string, string, string]> = [
      ["customerName", customerName, "Customer Name"],
      ["licensePlate", licensePlate, "Plate"],
      ["state", vehicleState, "State"],
      ["serviceType", serviceType, "Service Required"],
      ["expectedCompletionDate", expectedCompletionDate, "Target Completion"],
    ];
    const blank = required.filter(([, value]) => !value.trim());
    if (blank.length > 0) {
      const labels = blank.map(([, , label]) => label);
      setMissing(blank.map(([field]) => field));
      setError(
        labels.length === 1
          ? `${labels[0]} is required.`
          : `Still needed: ${labels.join(", ")}.`,
      );
      return;
    }
    setMissing([]);
    setIsSubmitting(true);
    let finalMake = "Unknown",
      finalModel = "Vehicle",
      finalYear = new Date().getFullYear(),
      finalImageUrl = "";

    if (vin && vin.length === 17) {
      try {
        const nhtsaResponse = await fetch(
          `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`,
        );
        const nhtsaData = await nhtsaResponse.json();
        const vehicleInfo = nhtsaData.Results[0];
        if (vehicleInfo.Make && vehicleInfo.Model) {
          finalMake = vehicleInfo.Make;
          finalModel = vehicleInfo.Model;
          finalYear = Number(vehicleInfo.ModelYear) || finalYear;
          const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(finalMake + " " + finalModel)}&limit=1&format=json&origin=*`;
          const searchResponse = await fetch(searchUrl);
          const searchData = await searchResponse.json();
          if (searchData[1] && searchData[1].length > 0) {
            const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchData[1][0])}`;
            const summaryResponse = await fetch(summaryUrl);
            const summaryData = await summaryResponse.json();
            if (summaryData.originalimage?.source)
              finalImageUrl = summaryData.originalimage.source;
            else if (summaryData.thumbnail?.source)
              finalImageUrl = summaryData.thumbnail.source;
          }
        }
      } catch {
        console.warn("Background decoding failed.");
      }
    }

    const payload = {
      customerName,
      serviceType,
      severity,
      expectedCompletionDate,
      assignedWorker: isAdmin ? assignedWorkers : "",
      status: "PENDING",
      vehicle: {
        vin: vin || null,
        licensePlate,
        state: vehicleState,
        make: finalMake,
        model: finalModel,
        year: finalYear,
        carImageUrl: finalImageUrl,
      },
    };

    try {
      await apiFetch("/api/repairs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setCustomerName("");
      setVin("");
      setLicensePlate("");
      setServiceType("");
      setSeverity(3);
      setExpectedCompletionDate("");
      setMissing([]);
      if (isAdmin) setAssignedWorkers("");
      onSuccess();
    } catch (err) {
      // apiFetch has already turned the backend's {"error": "..."} into the
      // message, so a rejected ticket says which field is wrong instead of
      // guessing that the server is down.
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not submit the ticket. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="overflow-visible">
      {error && (
        <div className="text-white bg-amstar-red/20 border border-amstar-red p-3 rounded-lg mb-4 text-sm font-bold">
          {error}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        <div>
          <label className={LABEL_STYLE}>Customer Name</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={`${SHARED_INPUT_STYLE} ${ringIfMissing("customerName", customerName)}`}
          />
        </div>
        <div>
          <label className={LABEL_STYLE}>VIN (17-Digits)</label>
          <input
            type="text"
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            maxLength={17}
            placeholder="e.g. 1G1RC..."
            className={`${SHARED_INPUT_STYLE} font-mono tabular-nums`}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={LABEL_STYLE}>Plate</label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              className={`${SHARED_INPUT_STYLE} tabular-nums ${ringIfMissing("licensePlate", licensePlate)}`}
            />
          </div>
          <StateSearch
            value={vehicleState}
            onChange={setVehicleState}
            className={ringIfMissing("state", vehicleState)}
          />
        </div>

        <div>
          <label className={LABEL_STYLE}>Service Required</label>
          <ServicePicker
            value={serviceType}
            onChange={setServiceType}
            historicalMap={historicalServiceMap}
            onAutoSetSeverity={setSeverity}
            className={ringIfMissing("serviceType", serviceType)}
          />
        </div>

        {isAdmin && (
          <div>
            <label className={LABEL_STYLE}>
              Assign Technician(s){" "}
              <span className="font-normal text-xs text-amstar-ink-faint ml-2 normal-case tracking-normal">
                (Optional)
              </span>
            </label>
            <div className="relative">
              <FormWorkerDropdown
                currentWorkers={assignedWorkers}
                technicianNames={technicianNames}
                onAssign={setAssignedWorkers}
              />
            </div>
          </div>
        )}

        {/* === REPLACED NATIVE DATE WITH CUSTOM COMPONENT === */}
        <div>
          <label className={LABEL_STYLE}>Target Completion</label>
          <CustomDatePicker
            value={expectedCompletionDate}
            onChange={setExpectedCompletionDate}
            className={`${SELECT_TRIGGER_STYLE} ${ringIfMissing("expectedCompletionDate", expectedCompletionDate)}`}
          />
        </div>

        <div className="md:col-span-2">
          <label className={LABEL_STYLE}>Severity Level</label>
          <SeveritySegments value={severity} onChange={setSeverity} />
        </div>
        <div className="md:col-span-2 flex justify-end gap-3 mt-2 pt-5 border-t border-amstar-line-soft">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-transparent border border-amstar-line hover:bg-amstar-raised text-amstar-ink-dim rounded-sm font-cond uppercase tracking-widest text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${PRIMARY_BUTTON_STYLE} px-6 py-2.5 font-bold`}
          >
            {isSubmitting
              ? "Decoding VIN & Submitting..."
              : "Add Vehicle to Queue"}
          </button>
        </div>
      </form>
    </div>
  );
};
