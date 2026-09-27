export type CvContactActionsProps = {
  name: string;
  phone: string;
  email: string;
  /** The generated PDF, e.g. `/cv/pdf`. */
  pdfHref: string;
};

export type UseCvContactActionsProps = CvContactActionsProps & {};

/** Which value was just copied — drives the "Copied" tick on that button. */
export type CvCopiedField = "phone" | "email" | "link";
