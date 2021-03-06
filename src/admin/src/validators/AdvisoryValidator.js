import moment from "moment";

export function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

export function validateOptionalNumber(field) {
  field.setError("");
  if (field.value && isNaN(field.value)) {
    field.setError("Please enter a valid number");
    return false;
  }
  return true;
}

export function validateRequiredText(field) {
  field.setError("");
  if (!field.value) {
    field.setError("Please enter " + field.text);
    return false;
  }
  return true;
}

export function validateRequiredSelect(field) {
  field.setError("");
  if (!field.value) {
    field.setError("Please select " + field.text);
    return false;
  }
  return true;
}

export function validateRequiredMultiSelect(field) {
  field.setError("");
  if (isEmpty(field.value)) {
    field.setError("Please select " + field.text);
    return false;
  }
  return true;
}

export function validateOptionalDate(field) {
  field.setError("");
  if (field.value) {
    return validateDate(field);
  } else {
    return true;
  }
}

export function validateRequiredDate(field) {
  field.setError("");
  return validateDate(field);
}
export function validateDate(field) {
  var date = moment(field.value);
  if (!date.isValid()) {
    field.setError("Please enter valid date");
    return false;
  }
  return true;
}

export function validAdvisoryData(advisoryData, mode) {
  advisoryData.formError("");
  const validListingRank = validateOptionalNumber(advisoryData.listingRank);
  const validTicketNumber = validateOptionalNumber(advisoryData.ticketNumber);
  const validHeadline = validateRequiredText(advisoryData.headline);
  const validEventType = validateRequiredSelect(advisoryData.eventType);
  const validAccessStatus = validateRequiredSelect(advisoryData.accessStatus);
  const validDescription = validateRequiredText(advisoryData.description);
  const validUrgency = validateRequiredSelect(advisoryData.urgency);
  const validLocations = validateRequiredMultiSelect(advisoryData.locations);
  const validAdvisoryDate = validateRequiredDate(advisoryData.advisoryDate);
  const validStartDate = validateOptionalDate(advisoryData.startDate);
  const validEndDate = validateOptionalDate(advisoryData.endDate);
  const validExpiryDate = validateOptionalDate(advisoryData.expiryDate);
  const validSubmittedBy = validateRequiredText(advisoryData.submittedBy);
  let validData =
    validListingRank &&
    validTicketNumber &&
    validHeadline &&
    validEventType &&
    validAccessStatus &&
    validDescription &&
    validUrgency &&
    validLocations &&
    validAdvisoryDate &&
    validStartDate &&
    validEndDate &&
    validExpiryDate &&
    validSubmittedBy;
  if (mode === "update") {
    const validUpdatedDate = validateOptionalDate(advisoryData.updatedDate);
    const validAdvisoryStatus = validateRequiredSelect(
      advisoryData.advisoryStatus
    );
    validData = validData && validUpdatedDate && validAdvisoryStatus;
  }
  if (!validData) {
    advisoryData.formError("Errors found !!! Please enter valid information");
  }
  return validData;
}
