/**
 * What the store needs from a courier, stated once so a second courier is a
 * new file rather than a new set of call sites.
 *
 * The store's side of the bargain is small on purpose: it knows an address, a
 * number of pieces and, for a cash order, the money to collect at the door. It
 * does not know about airway bills, zones or pickup windows, and nothing here
 * leaks a courier's vocabulary into the dashboard.
 */

/** The address as checkout captured it, which is all a label ever gets. */
export type ShipmentAddress = {
  fullName?: string;
  phone?: string;
  email?: string;
  line1?: string;
  line2?: string;
  city?: string;
  governorate?: string;
  country?: string;
};

export type ShipmentRequest = {
  orderNumber: string;
  address: ShipmentAddress;
  /** Pieces in the box, for the courier's own manifest. */
  itemsCount: number;
  /**
   * Cash the courier collects at the door, in piastres. Zero for an order that
   * was already paid by card — the single most expensive field to get wrong.
   */
  collectCents: number;
  notes?: string | null;
};

export type Shipment = {
  /** Slug of the driver that booked it, stored on the order. */
  provider: string;
  /** What the courier calls the parcel, and what the customer follows. */
  trackingNumber: string;
  /** The courier's own id for the booking, for reprinting the airway bill. */
  shipmentId: string | null;
  trackingUrl: string | null;
};

export type CourierDriver = {
  /** Slug stored on the order. */
  provider: string;
  /** Shown on the button, and matched against the `COURIERS` list. */
  label: string;
  createShipment(request: ShipmentRequest): Promise<Shipment>;
  /** A link to the printable airway bill, when the courier offers one. */
  labelUrl?(shipmentId: string): Promise<string | null>;
};

/**
 * A courier refusing a booking is ordinary — a governorate they do not cover, a
 * phone number they will not accept. The message they gave is carried through
 * to the admin, because it is nearly always the thing that has to be fixed.
 */
export class CourierError extends Error {
  readonly body: unknown;

  constructor(message: string, body?: unknown) {
    super(message);
    this.name = "CourierError";
    this.body = body;
  }
}
