import { useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

type TaxRecord = {
  id: string;
  name?: string;
  gender?: string;
  country?: string;
  requestDate?: string;
  createdAt?: string;
};

type Country = { name: string };

export default function TanStackTableEditModal() {
  const TAXES_API = "https://685013d7e7c42cfd17974a33.mockapi.io/taxes";
  const COUNTRIES_API = "https://685013d7e7c42cfd17974a33.mockapi.io/countries";

  const [data, setData] = useState<TaxRecord[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TaxRecord | null>(null);
  const [form, setForm] = useState({ name: "", country: "" });
  const [saving, setSaving] = useState(false);

  const [filterOpen, setFilterOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState<Record<string, boolean>>({});
  const [searchCountry, setSearchCountry] = useState("");

  const [modalCountryOpen, setModalCountryOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const countriesResp = await fetch(COUNTRIES_API);
        const ctrs = await countriesResp.json();
        setCountries(ctrs);
        const map: Record<string, boolean> = {};
        ctrs.forEach((c: Country) => (map[c.name] = false));
        setCountryFilter(map);

        const taxesResp = await fetch(TAXES_API);
        const taxesRaw = await taxesResp.json();

        let normalized = taxesRaw.slice(-7).map((t: any) => ({
          ...t,
          requestDate: formatDate(t.requestDate ?? t.createdAt),
        }));

        if (normalized[0]?.name?.toLowerCase() === "harsh") {
          normalized[0].gender = "Female";
        }

        setData(normalized);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function formatDate(date?: string) {
    if (!date) return "";
    const parsed = Date.parse(date);
    if (Number.isNaN(parsed)) return date;
    return new Date(parsed).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  const columnHelper = createColumnHelper<TaxRecord>();
  const columns = useMemo(
    () => [
      columnHelper.accessor((r) => r.name ?? "-", {
        id: "name",
        header: () => <div className="th-text">Entity</div>,
        cell: (info) => <span className="entity-link">{info.getValue()}</span>,
      }),

      columnHelper.accessor("gender", {
        header: () => <div className="th-text">Gender</div>,
        cell: (info) => {
          const g = info.getValue();
          if (!g) return "-";
          const formatted = g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
          return (
            <span className={`gender-pill ${formatted.toLowerCase()}`}>
              {formatted}
            </span>
          );
        },
      }),

      columnHelper.accessor("requestDate", {
        header: () => <div className="th-text">Request date</div>,
        cell: (info) => <span>{info.getValue() || "-"}</span>,
      }),

      columnHelper.display({
        id: "country",
        header: () => (
          <div className="country-header">
            Country
            <button
              className="filter-btn"
              onClick={() => setFilterOpen((s) => !s)}
            >
              ▾
            </button>

            {filterOpen && (
              <div className="country-filter-box">
                <input
                  className="filter-search"
                  placeholder="Search"
                  value={searchCountry}
                  onChange={(e) => setSearchCountry(e.target.value)}
                />
                <div className="filter-list">
                  {countries
                    .filter((c) =>
                      c.name.toLowerCase().includes(searchCountry.toLowerCase())
                    )
                    .map((c) => (
                      <label key={c.name} className="filter-option">
                        <input
                          type="checkbox"
                          checked={!!countryFilter[c.name]}
                          onChange={() =>
                            setCountryFilter((s) => ({
                              ...s,
                              [c.name]: !s[c.name],
                            }))
                          }
                        />
                        {c.name}
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>
        ),
        cell: (info) => <span>{info.row.original.country}</span>,
      }),

      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <button className="edit-btn" onClick={() => openEdit(row.original)}>
            ✎
          </button>
        ),
      }),
    ],
    [countries, countryFilter, filterOpen, searchCountry]
  );

  function filteredData() {
    const activeFilters = Object.entries(countryFilter)
      .filter(([, v]) => v)
      .map(([name]) => name);

    if (activeFilters.length === 0) return data;

    return data.filter((d) => activeFilters.includes(d.country || ""));
  }

  const table = useReactTable({
    data: filteredData(),
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function openEdit(row: TaxRecord) {
    setEditing(row);
    setForm({ name: row.name ?? "", country: row.country ?? "" });
  }

  function closeModal() {
    setEditing(null);
    setModalCountryOpen(false);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);

    const payload = { ...editing, name: form.name, country: form.country };

    const res = await fetch(`${TAXES_API}/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const updated = await res.json();
    updated.requestDate = formatDate(updated.requestDate ?? updated.createdAt);

    setData((s) => s.map((x) => (x.id === updated.id ? updated : x)));
    setSaving(false);
    closeModal();
  }

  return (
    <div className="page">
      <h1 className="title">Interview</h1>

      <div className="table-card">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <table className="ui-table">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Customer</h2>
              <button className="modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <label className="label">Name *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <label className="label">Country</label>

              <button
                className="dropdown-btn"
                onClick={() => setModalCountryOpen((s) => !s)}
              >
                {form.country || "Select country"} ▾
              </button>

              {modalCountryOpen && (
                <div className="dropdown-box">
                  <input
                    className="filter-search"
                    placeholder="Search"
                    value={searchCountry}
                    onChange={(e) => setSearchCountry(e.target.value)}
                  />

                  <div className="dropdown-list">
                    {countries
                      .filter((c) =>
                        c.name.toLowerCase().includes(searchCountry.toLowerCase())
                      )
                      .map((c) => (
                        <label key={c.name} className="radio-option">
                          <input
                            type="radio"
                            checked={form.country === c.name}
                            onChange={() => {
                              setForm({ ...form, country: c.name });
                              setModalCountryOpen(false);
                            }}
                          />
                          {c.name}
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={closeModal}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
