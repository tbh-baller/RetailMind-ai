import * as alertsService from "../services/alerts.service.js";

export async function getAlerts(_req, res) {
  const alerts = await alertsService.getAlerts();
  res.json(alerts);
}
