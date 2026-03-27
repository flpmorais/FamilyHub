// Structured logger for FamilyHub.
// All output goes through ReactNativeJS in logcat.
// Filter with: adb logcat ReactNativeJS:* *:S | grep "\[FH"
//
// Levels:
//   [FH:INFO]  — general flow
//   [FH:WARN]  — unexpected but non-fatal
//   [FH:ERROR] — errors that surface to the user or break flows

const info = (ctx: string, msg: string, data?: unknown): void => {
  if (data !== undefined) {
    console.log(`[FH:INFO][${ctx}] ${msg}`, data);
  } else {
    console.log(`[FH:INFO][${ctx}] ${msg}`);
  }
};

const warn = (ctx: string, msg: string, data?: unknown): void => {
  if (data !== undefined) {
    console.warn(`[FH:WARN][${ctx}] ${msg}`, data);
  } else {
    console.warn(`[FH:WARN][${ctx}] ${msg}`);
  }
};

const error = (ctx: string, msg: string, err?: unknown): void => {
  if (err !== undefined) {
    console.error(`[FH:ERROR][${ctx}] ${msg}`, err);
  } else {
    console.error(`[FH:ERROR][${ctx}] ${msg}`);
  }
};

export const logger = { info, warn, error };
