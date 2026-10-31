"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AuditEvent,
  SimulatedVehicle,
  SimulatorStatus
} from "@/lib/types";

const EMPTY_STATUS: SimulatorStatus = {
  running: false,
  tick: 0,
  vehicleCount: 0,
  incidentId: null
};

async function jsonFetch<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      body || `${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export default function CommandCenter() {
  const [status, setStatus] =
    useState<SimulatorStatus>(EMPTY_STATUS);

  const [vehicles, setVehicles] =
    useState<SimulatedVehicle[]>([]);

  const [events, setEvents] =
    useState<AuditEvent[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  const [busyVehicle, setBusyVehicle] =
    useState<string | null>(null);

  const fleeingVehicle = useMemo(
    () =>
      vehicles.find(
        (vehicle) => vehicle.behavior === "FLEEING"
      ),
    [vehicles]
  );

  const refresh = useCallback(async () => {
    try {
      const [nextStatus, nextVehicles] =
        await Promise.all([
          jsonFetch<SimulatorStatus>(
            "/api/simulator/status"
          ),
          jsonFetch<SimulatedVehicle[]>(
            "/api/simulator/vehicles"
          )
        ]);

      setStatus(nextStatus);
      setVehicles(nextVehicles);
      setError(null);

      if (nextStatus.incidentId) {
        try {
          const nextEvents =
            await jsonFetch<AuditEvent[]>(
              `/api/incidents?incidentId=${encodeURIComponent(
                nextStatus.incidentId
              )}`
            );

          setEvents(nextEvents);
        } catch {
          // Platform timeline can fail independently.
        }
      } else {
        setEvents([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh CivicShield services."
      );
    }
  }, []);

  useEffect(() => {
    // Defer the first read so this effect never sets state synchronously;
    // the interval then refreshes the dashboard once per second.
    const initial = window.setTimeout(refresh, 0);
    const interval =
      window.setInterval(refresh, 1000);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  async function command(
    action: "start" | "stop" | "reset"
  ) {
    try {
      setError(null);

      await jsonFetch(
        `/api/simulator/${action}`,
        {
          method: "POST"
        }
      );

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Command failed."
      );
    }
  }

  async function authorizeSlowdown(
    vehicleId: string
  ) {
    const approved =
      window.confirm(
        `Authorize a SIMULATED controlled slowdown for ${vehicleId}?\n\nThis affects only the CivicShield software simulator.`
      );

    if (!approved) {
      return;
    }

    try {
      setBusyVehicle(vehicleId);
      setError(null);

      await jsonFetch(
        "/api/simulator/slowdown",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            vehicleId
          })
        }
      );

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Slowdown request failed."
      );
    } finally {
      setBusyVehicle(null);
    }
  }

  const maxPosition =
    Math.max(
      3,
      ...vehicles.map(
        (vehicle) =>
          vehicle.positionMiles
      )
    );

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">
            CIVICSHIELD LABS
          </p>

          <h1>
            Command Center
          </h1>

          <p className="subtitle">
            Public-safety systems
            simulation environment
          </p>
        </div>

        <div
          className={
            status.running
              ? "status running"
              : "status stopped"
          }
        >
          <span className="statusDot" />

          {status.running
            ? "SIMULATION RUNNING"
            : "SIMULATION STOPPED"}
        </div>
      </header>

      {error && (
        <section className="errorPanel">
          <strong>
            Service warning
          </strong>

          <span>{error}</span>
        </section>
      )}

      <section className="toolbar">
        <button
          className="primaryButton"
          onClick={() =>
            command("start")
          }
          disabled={status.running}
        >
          Start Scenario
        </button>

        <button
          className="button"
          onClick={() =>
            command("stop")
          }
          disabled={!status.running}
        >
          Stop
        </button>

        <button
          className="button"
          onClick={() =>
            command("reset")
          }
        >
          Reset
        </button>

        <div className="toolbarMeta">
          <span>
            Tick {status.tick}
          </span>

          <span>
            {status.vehicleCount} vehicles
          </span>

          <span>
            Incident{" "}
            {status.incidentId
              ? status.incidentId.slice(
                  0,
                  8
                )
              : "—"}
          </span>
        </div>
      </section>

      <div className="dashboardGrid">
        <section className="panel roadPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">
                LIVE SIMULATION
              </p>

              <h2>
                Freeway corridor
              </h2>
            </div>

            <span className="simulationBadge">
              SYNTHETIC DATA
            </span>
          </div>

          <div className="road">
            <div className="roadCenterLine" />

            {vehicles.map(
              (vehicle, index) => {
                const position =
                  Math.min(
                    94,
                    Math.max(
                      2,
                      (vehicle.positionMiles /
                        maxPosition) *
                        92
                    )
                  );

                return (
                  <div
                    key={
                      vehicle.vehicleId
                    }
                    className={`vehicleMarker ${vehicle.behavior.toLowerCase()}`}
                    style={{
                      left: `${position}%`,
                      top:
                        index % 2 === 0
                          ? "25%"
                          : "63%"
                    }}
                    title={`${vehicle.vehicleId} ${vehicle.speedMph.toFixed(
                      0
                    )} mph`}
                  >
                    <div className="carIcon">
                      ●
                    </div>

                    <div className="vehicleLabel">
                      <strong>
                        {vehicle.plate}
                      </strong>

                      <span>
                        {Math.round(
                          vehicle.speedMph
                        )}{" "}
                        mph
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>

          <div className="roadLegend">
            <span>
              ● Normal
            </span>

            <span>
              ● Speeding
            </span>

            <span>
              ● Fleeing
            </span>

            <span>
              ● Stopped
            </span>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">
                PRIORITY EVENT
              </p>

              <h2>
                SafeStop
              </h2>
            </div>
          </div>

          {fleeingVehicle ? (
            <div className="priorityCard">
              <div className="alertHeader">
                FLEEING VEHICLE
              </div>

              <div className="vehicleIdentity">
                <strong>
                  {
                    fleeingVehicle.plate
                  }
                </strong>

                <span>
                  {
                    fleeingVehicle.make
                  }{" "}
                  {
                    fleeingVehicle.model
                  }
                </span>
              </div>

              <dl className="details">
                <div>
                  <dt>
                    Vehicle ID
                  </dt>
                  <dd>
                    {
                      fleeingVehicle.vehicleId
                    }
                  </dd>
                </div>

                <div>
                  <dt>
                    Speed
                  </dt>
                  <dd>
                    {Math.round(
                      fleeingVehicle.speedMph
                    )}{" "}
                    mph
                  </dd>
                </div>

                <div>
                  <dt>
                    Position
                  </dt>
                  <dd>
                    {fleeingVehicle.positionMiles.toFixed(
                      2
                    )}{" "}
                    mi
                  </dd>
                </div>

                <div>
                  <dt>
                    Mode
                  </dt>
                  <dd>
                    SIMULATED
                  </dd>
                </div>
              </dl>

              <div className="safetyNotice">
                Human authorization
                required. No physical
                vehicle is connected.
              </div>

              <button
                className="dangerButton"
                disabled={
                  busyVehicle ===
                  fleeingVehicle.vehicleId
                }
                onClick={() =>
                  authorizeSlowdown(
                    fleeingVehicle.vehicleId
                  )
                }
              >
                {busyVehicle
                  ? "Processing..."
                  : "Authorize Simulated Slowdown"}
              </button>
            </div>
          ) : (
            <div className="emptyState">
              No active fleeing vehicle.
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">
              VEHICLE TELEMETRY
            </p>

            <h2>
              Active vehicles
            </h2>
          </div>
        </div>

        <div className="tableWrapper">
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Plate</th>
                <th>Make / Model</th>
                <th>Speed</th>
                <th>Position</th>
                <th>Behavior</th>
              </tr>
            </thead>

            <tbody>
              {vehicles.map(
                (vehicle) => (
                  <tr
                    key={
                      vehicle.vehicleId
                    }
                  >
                    <td>
                      {
                        vehicle.vehicleId
                      }
                    </td>

                    <td>
                      <strong>
                        {vehicle.plate}
                      </strong>
                    </td>

                    <td>
                      {vehicle.make}{" "}
                      {vehicle.model}
                    </td>

                    <td>
                      {Math.round(
                        vehicle.speedMph
                      )}{" "}
                      mph
                    </td>

                    <td>
                      {vehicle.positionMiles.toFixed(
                        2
                      )}{" "}
                      mi
                    </td>

                    <td>
                      <span
                        className={`behavior ${vehicle.behavior.toLowerCase()}`}
                      >
                        {
                          vehicle.behavior
                        }
                      </span>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">
              AUDIT EVIDENCE
            </p>

            <h2>
              Incident timeline
            </h2>
          </div>
        </div>

        <div className="timeline">
          {events.length === 0 ? (
            <div className="emptyState">
              Start the simulation to
              create an incident and
              audit timeline.
            </div>
          ) : (
            [...events]
              .reverse()
              .map((event) => (
                <div
                  className="timelineItem"
                  key={event.id}
                >
                  <div className="timelineDot" />

                  <div>
                    <div className="timelineTop">
                      <strong>
                        {event.action}
                      </strong>

                      <time>
                        {new Date(
                          event.createdAt
                        ).toLocaleTimeString()}
                      </time>
                    </div>

                    <p>
                      {event.details ??
                        "No additional details"}
                    </p>

                    <small>
                      Actor: {event.actor}
                    </small>
                  </div>
                </div>
              ))
          )}
        </div>
      </section>

      <footer>
        CivicShield Labs ·
        Development simulation only ·
        No real enforcement systems
        connected
      </footer>
    </main>
  );
}
