const tripService = require('../services/trip.service');

async function listTrips(req, res) {
  const trips = await tripService.list({
    status: req.query.status,
    vehicleId: req.query.vehicleId ? Number(req.query.vehicleId) : undefined,
    driverId: req.query.driverId ? Number(req.query.driverId) : undefined,
  });

  res.status(200).json({ success: true, data: trips });
}

async function getTrip(req, res) {
  const trip = await tripService.findById(Number(req.params.id));

  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found.' });
  }

  res.status(200).json({ success: true, data: trip });
}

async function createTrip(req, res) {
  const trip = await tripService.create(req.body, req.user.id);

  res.status(201).json({ success: true, data: trip });
}

async function updateTrip(req, res) {
  const trip = await tripService.update(Number(req.params.id), req.body);

  res.status(200).json({ success: true, data: trip });
}

async function dispatchTrip(req, res) {
  const trip = await tripService.dispatch(Number(req.params.id));

  res.status(200).json({
    success: true,
    data: trip,
    message: 'Trip dispatched. Vehicle and driver marked On Trip.',
  });
}

async function completeTrip(req, res) {
  const trip = await tripService.complete(Number(req.params.id), req.body);

  res.status(200).json({
    success: true,
    data: trip,
    message: 'Trip completed. Vehicle and driver restored to Available.',
  });
}

async function cancelTrip(req, res) {
  const trip = await tripService.cancel(Number(req.params.id));

  res.status(200).json({
    success: true,
    data: trip,
    message: 'Trip cancelled.',
  });
}

module.exports = {
  listTrips,
  getTrip,
  createTrip,
  updateTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip,
};
