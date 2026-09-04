import { validateCreateDonationInput } from "./donation.validation.js";

try {
  const result = validateCreateDonationInput({
    donationType: "MONETARY",
    donatedAt: "2026-09-01T10:00:00Z",
    monetaryAmount: 500,
    paymentMethod: "CASH",
    isAnonymous: false,

    fundRestriction: "RESTRICTED",
    restrictionCategory: "FOOD",

    // purpose intentionally missing
  });

  console.log(result);
} catch (error) {
  console.log(error.message);
}
