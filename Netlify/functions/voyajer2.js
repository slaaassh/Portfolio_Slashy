exports.handler = async function () {
  try {
    // Ora attuale in UTC
    const now = new Date();

    const currentTime = now
      .toISOString()
      .replace("T", " ")
      .slice(0, 16);

    // Parametri per JPL Horizons
    const params = new URLSearchParams({
      format: "json",
      COMMAND: "'-32'",          // Voyager 2
      OBJ_DATA: "'NO'",
      MAKE_EPHEM: "'YES'",
      EPHEM_TYPE: "'OBSERVER'",
      CENTER: "'500@399'",       // vista dal centro della Terra
      TLIST: `'${currentTime}'`,
      TLIST_TYPE: "'CAL'",
      QUANTITIES: "'1'",         // RA + DEC
      ANG_FORMAT: "'DEG'",
      CSV_FORMAT: "'YES'"
    });

    const url =
      "https://ssd.jpl.nasa.gov/api/horizons.api?" +
      params.toString();

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Errore nella richiesta a JPL");
    }

    const data = await response.json();

    // Horizons mette i dati tra $$SOE e $$EOE
    const match = data.result.match(
      /\$\$SOE\s*([\s\S]*?)\$\$EOE/
    );

    if (!match) {
      throw new Error("Coordinate Voyager 2 non trovate");
    }

    const firstLine = match[1]
      .trim()
      .split("\n")[0];

    const values = firstLine
      .split(",")
      .map(v => v.trim())
      .filter(v => v !== "");

    const raDeg = parseFloat(values[1]);
    const decDeg = parseFloat(values[2]);

    if (
      Number.isNaN(raDeg) ||
      Number.isNaN(decDeg)
    ) {
      throw new Error("Coordinate non valide");
    }

    // ----------------------------
    // RA: gradi → ore/minuti
    // ----------------------------

    const raTotalHours = raDeg / 15;

    const raHours = Math.floor(raTotalHours);

    const raMinutes = Math.floor(
      (raTotalHours - raHours) * 60
    );

    // ----------------------------
    // DEC: gradi → gradi/minuti
    // ----------------------------

    const decSign = decDeg >= 0 ? "+" : "−";

    const absoluteDec = Math.abs(decDeg);

    const decDegrees = Math.floor(absoluteDec);

    const decMinutes = Math.floor(
      (absoluteDec - decDegrees) * 60
    );

    const display =
      `VGR2 ${String(raHours).padStart(2, "0")}h` +
      `${String(raMinutes).padStart(2, "0")}m ` +
      `${decSign}${String(decDegrees).padStart(2, "0")}°` +
      `${String(decMinutes).padStart(2, "0")}′`;

    return {
      statusCode: 200,

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        display: display,
        ra: raDeg,
        dec: decDeg,
        time: currentTime
      })
    };

  } catch (error) {

    console.error(error);

    return {
      statusCode: 500,

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        error: error.message
      })
    };
  }
};