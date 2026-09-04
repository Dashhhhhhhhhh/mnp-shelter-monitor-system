import {
  createDonationService,
  getDonationsService,
  getDonationByIdService,
  voidDonationService,
  createRestrictionChangeService,
  getRestrictionChangesService,
} from "../services/donation.services.js";

async function createDonationController(req, res, next) {
  try {
    const idempotencyKey = req.get("Idempotency-Key");

    const { donation, isReplay } = await createDonationService(
      req.body,
      req.user.userId,
      idempotencyKey,
    );

    res.status(isReplay ? 200 : 201).json({
      success: true,
      donation,
      isReplay,
    });
  } catch (error) {
    next(error);
  }
}

async function getDonationsController(req, res, next) {
  try {
    const donations = await getDonationsService();

    res.status(200).json({
      success: true,
      donations,
    });
  } catch (error) {
    next(error);
  }
}

async function getDonationByIdController(req, res, next) {
  try {
    const donation = await getDonationByIdService(req.params.donationId);

    return res.status(200).json({
      success: true,
      donation,
    });
  } catch (error) {
    next(error);
  }
}

async function voidDonationController(req, res, next) {
  try {
    const donation = await voidDonationService(
      req.params.donationId,
      req.body,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      donation,
    });
  } catch (error) {
    next(error);
  }
}

async function createRestrictionChangeController(req, res, next) {
  try {
    const idempotencyKey = req.get("Idempotency-Key");

    const { restrictionChange, isReplay } =
      await createRestrictionChangeService(
        req.params.donationId,
        req.body,
        req.user.userId,
        idempotencyKey,
      );

    res.status(isReplay ? 200 : 201).json({
      success: true,
      restrictionChange,
      isReplay,
    });
  } catch (error) {
    next(error);
  }
}

async function getRestrictionChangesController(req, res, next) {
  try {
    const restrictionChanges = await getRestrictionChangesService(
      req.params.donationId,
    );

    res.status(200).json({
      success: true,
      restrictionChanges,
    });
  } catch (error) {
    next(error);
  }
}

export {
  createDonationController,
  getDonationsController,
  getDonationByIdController,
  voidDonationController,
  createRestrictionChangeController,
  getRestrictionChangesController,
};
