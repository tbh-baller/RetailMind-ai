import * as forecastService from "../services/forecast.service.js";

export async function getForecast(_req, res) {
  const forecast = await forecastService.getDemandForecast();
  res.json(forecast);
}
