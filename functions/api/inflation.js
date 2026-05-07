export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const country = (url.searchParams.get("country") || "US").toUpperCase();
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (!start || !end) {
    return json({
      error: "Missing start or end month. Use YYYY-MM."
    }, 400);
  }

  try {
    const series = await getSeriesForCountry(country, env);

    if (!series.length) {
      return json({
        error: `No monthly CPI data available for ${country}.`
      }, 404);
    }

    const filtered = filterSeries(series, start, end);

    if (filtered.length < 2) {
      return json({
        error: `Not enough CPI points between ${start} and ${end}.`
      }, 404);
    }

    return json({
      country,
      start,
      end,
      series: filtered
    });
  } catch (err) {
    return json({
      error: err?.message || "Inflation proxy failed."
    }, 500);
  }
}

async function getSeriesForCountry(country, env) {
  if (country === "US") {
    return await fetchUSMonthlyCPI(env);
  }

  throw new Error(
    `Country ${country} is not wired yet. Add an adapter in functions/api/inflation.js.`
  );
}

async function fetchUSMonthlyCPI(env) {
  const response = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      seriesid: ["CPIAUCSL"],
      startyear: "1947",
      endyear: String(new Date().getUTCFullYear() + 1)
    })
  });

  if (!response.ok) {
    throw new Error(`BLS request failed: ${response.status}`);
  }

  const data = await response.json();
  const rows = data?.Results?.series?.[0]?.data || [];

  const series = rows
    .map((row) => {
      const year = Number(row.year);
      const period = String(row.period || "");
      const value = Number(row.value);

      if (!Number.isFinite(year) || !period.startsWith("M") || !Number.isFinite(value)) {
        return null;
      }

      const month = Number(period.slice(1));
      if (!Number.isFinite(month)) return null;

      return {
        date: `${year}-${String(month).padStart(2, "0")}`,
        cpi: value
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

  return series;
}

function filterSeries(series, start, end) {
  return series.filter((row) => row.date >= start && row.date <= end);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
        }
