import enum


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    PROVIDER = "provider"
    DRIVER = "driver"
    ADMIN = "admin"


class OTPPurpose(str, enum.Enum):
    REGISTRATION = "registration"
    LOGIN = "login"
    PASSWORD_RESET = "password_reset"


class VehicleType(str, enum.Enum):
    MOTORCYCLE = "motorcycle"
    VAN = "van"
    PICKUP = "pickup"
    TRUCK = "truck"
    REFRIGERATED_TRUCK = "refrigerated_truck"
    CONTAINER = "container"


class CargoType(str, enum.Enum):
    AGRICULTURE = "agriculture"
    FOOD = "food"
    CONSTRUCTION = "construction"
    RETAIL = "retail"
    INDUSTRIAL = "industrial"
    OTHER = "other"


class UrgencyLevel(str, enum.Enum):
    STANDARD = "standard"
    EXPRESS = "express"
    URGENT = "urgent"


class ShipmentStatus(str, enum.Enum):
    PENDING = "pending"
    QUOTED = "quoted"
    BOOKED = "booked"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class AuctionStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class SharedCargoStatus(str, enum.Enum):
    OPEN = "open"
    FULL = "full"
    DEPARTED = "departed"
    CANCELLED = "cancelled"


class SharedCargoBookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class PaymentMethod(str, enum.Enum):
    MPESA = "mpesa"
    AIRTEL_MONEY = "airtel_money"
    TIGO_PESA = "tigo_pesa"
    HALOPESA = "halopesa"
    BANK = "bank"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class NotificationType(str, enum.Enum):
    BOOKING_UPDATE = "booking_update"
    PAYMENT = "payment"
    AUCTION = "auction"
    SYSTEM = "system"


class SMSStatus(str, enum.Enum):
    SENT = "sent"
    FAILED = "failed"
    PENDING = "pending"
