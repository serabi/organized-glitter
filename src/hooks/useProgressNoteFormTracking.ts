/**
 * @interface FormTrackingData
 * @description Interface for data tracked during form submission start.
 */
interface FormTrackingData {
  hasDate: boolean;
  hasContent: boolean;
  contentLength: number;
  hasImage: boolean;
  imageFileName?: string;
  imageSize?: number;
  imageType?: string;
  selectedDate?: string;
  formDisabled?: boolean;
}

/**
 * @interface ImageTrackingData
 * @description Interface for data tracked during image selection.
 */
interface ImageTrackingData {
  hasImage: boolean;
  imageMetadata?: {
    name: string;
    size: number;
    type: string;
    sizeInMB: number;
  };
  previousImageName?: string;
}

/**
 * @interface CompressionTrackingData
 * @description Interface for data tracked during image compression.
 */
interface CompressionTrackingData {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  originalSizeMB: number;
  compressedSizeMB: number;
}

/**
 * Custom hook for tracking various events within the progress note form.
 * Logs events to the console.
 * @returns {Object} An object containing various tracking functions.
 */
export const useProgressNoteFormTracking = () => {
  /**
   * Tracks the initiation of a form submission.
   * @param {FormTrackingData} data - Data related to the form state at submission start.
   */
  const trackFormSubmissionStart = (data: FormTrackingData) => {
    // addBreadcrumb removed
    console.log('Progress note form submission started', data);
  };

  /**
   * Tracks validation failures in the form.
   * @param {boolean} missingDate - Whether the date is missing.
   * @param {boolean} missingContent - Whether the content is missing.
   * @param {number} contentLength - The length of the content.
   */
  const trackValidationFailure = (
    missingDate: boolean,
    missingContent: boolean,
    contentLength: number
  ) => {
    // addBreadcrumb removed
    console.log('Progress note form validation failed', {
      missingDate,
      missingContent,
      contentLength,
    });
  };

  /**
   * Tracks when form data is prepared for submission.
   * @param {string} date - The selected date.
   * @param {number} contentLength - The length of the content.
   * @param {File} [imageFile] - The selected image file, if any.
   */
  const trackDataPrepared = (date: string, contentLength: number, imageFile?: File) => {
    // addBreadcrumb removed
    console.log('Progress note form data prepared for submission', {
      date,
      contentLength,
      hasImage: Boolean(imageFile),
      imageFile,
    });
  };

  /**
   * Tracks successful form submissions.
   * @param {string} date - The submitted date.
   * @param {number} contentLength - The length of the submitted content.
   * @param {boolean} hasImage - Whether an image was included in the submission.
   */
  const trackSubmissionSuccess = (date: string, contentLength: number, hasImage: boolean) => {
    // addBreadcrumb removed
    console.log('Progress note form submitted successfully', { date, contentLength, hasImage });
  };

  /**
   * Tracks errors that occur during form submission.
   * @param {string} date - The date at the time of error.
   * @param {number} contentLength - The content length at the time of error.
   * @param {boolean} hasImage - Whether an image was selected at the time of error.
   * @param {unknown} error - The error object or message.
   */
  const trackSubmissionError = (
    date: string,
    contentLength: number,
    hasImage: boolean,
    error: unknown
  ) => {
    // addBreadcrumb removed
    console.error('Progress note form submission failed', { date, contentLength, hasImage, error });
  };

  /**
   * Tracks the selection of an image file.
   * @param {ImageTrackingData} data - Data related to the selected image.
   */
  const trackImageSelection = (data: ImageTrackingData) => {
    // addBreadcrumb removed
    console.log('Progress note form image selected', data);
  };

  /**
   * Tracks the successful compression of an image.
   * @param {CompressionTrackingData} data - Data related to the image compression.
   */
  const trackImageCompression = (data: CompressionTrackingData) => {
    // addBreadcrumb removed
    console.log('Progress note image compressed', data);
  };

  /**
   * Tracks failures during image compression.
   * @param {unknown} error - The error object or message.
   * @param {number} originalSize - The original size of the image that failed to compress.
   */
  const trackCompressionFailure = (error: unknown, originalSize: number) => {
    // addBreadcrumb removed
    console.error('Progress note image compression failed', { error, originalSize });
  };

  /**
   * Tracks changes to the date input field.
   * @param {string} previousDate - The date value before the change.
   * @param {string} newDate - The new date value.
   */
  const trackDateChange = (previousDate: string, newDate: string) => {
    // addBreadcrumb removed
    console.log('Progress note form date changed', { previousDate, newDate });
  };

  /**
   * Tracks changes to the content textarea.
   * @param {number} contentLength - The new length of the content.
   * @param {boolean} hasContent - Whether the content textarea has text.
   * @param {boolean} isSignificantChange - Whether the change is considered significant for tracking.
   */
  const trackContentChange = (
    contentLength: number,
    hasContent: boolean,
    isSignificantChange: boolean
  ) => {
    // addBreadcrumb removed
    console.log('Progress note form content updated', {
      contentLength,
      hasContent,
      isSignificantChange,
    });
  };

  return {
    trackFormSubmissionStart,
    trackValidationFailure,
    trackDataPrepared,
    trackSubmissionSuccess,
    trackSubmissionError,
    trackImageSelection,
    trackImageCompression,
    trackCompressionFailure,
    trackDateChange,
    trackContentChange,
  };
};
