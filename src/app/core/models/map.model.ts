import { GeolocationPosition } from '../services/geolocation.service';

export interface MapConfig {
  center: google.maps.LatLngLiteral;
  zoom: number;
  styles?: google.maps.MapTypeStyle[];
  options?: google.maps.MapOptions;
}

export interface MapMarker {
  id: string;
  position: google.maps.LatLngLiteral;
  title: string;
  type: 'driver' | 'client' | 'delivery' | 'warehouse' | 'zone';
  status?: 'online' | 'offline' | 'busy' | 'available' | 'delivered' | 'pending';
  icon?: {
    url: string;
    scaledSize?: google.maps.Size;
    origin?: google.maps.Point;
    anchor?: google.maps.Point;
  };
  data?: any; // Données associées (driver, shipment, etc.)
  animation?: google.maps.Animation;
  draggable?: boolean;
  visible?: boolean;
}

export interface MapRoute {
  id: string;
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  waypoints?: google.maps.DirectionsWaypoint[];
  polylineOptions?: google.maps.PolylineOptions;
  visible: boolean;
  optimized: boolean;
  routeInfo?: {
    distance: string;
    duration: string;
    traffic?: string;
  };
}

export interface MapInfoWindow {
  markerId: string;
  content: string;
  position?: google.maps.LatLngLiteral;
  visible: boolean;
  maxWidth?: number;
}

export interface RealTimeMapState {
  activeDrivers: MapMarker[];
  selectedDriver?: MapMarker;
  activeRoutes: MapRoute[];
  infoWindows: MapInfoWindow[];
  filterOptions: {
    showOnlineOnly: boolean;
    showRoutes: boolean;
    driverStatus: string[];
    timeRange: {
      start?: Date;
      end?: Date;
    };
  };
  mapCenter: google.maps.LatLngLiteral;
  mapZoom: number;
}

export interface DeliveryMapMarker extends MapMarker {
  shipmentId?: string;
  deliveryStatus: 'pending' | 'in_progress' | 'delivered' | 'failed';
  estimatedArrival?: Date;
  customerInfo?: {
    name: string;
    phone?: string;
    address: string;
  };
  deliveryInstructions?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface DriverMapState {
  currentPosition?: GeolocationPosition;
  destination?: google.maps.LatLngLiteral;
  route?: MapRoute;
  deliveryMarkers: DeliveryMapMarker[];
  navigationMode: 'overview' | 'navigation' | 'delivery';
  routeProgress: {
    distanceRemaining: string;
    timeRemaining: string;
    progress: number; // 0-100%
  };
  nextDelivery?: DeliveryMapMarker;
}

export interface GeofenceZoneMarker {
  id: string;
  center: google.maps.LatLngLiteral;
  radius: number;
  name: string;
  type: 'delivery_zone' | 'restricted_zone' | 'warehouse' | 'depot';
  color: string;
  active: boolean;
  circle?: google.maps.Circle;
}

export interface MapLegend {
  items: {
    icon: string;
    label: string;
    color?: string;
    description?: string;
  }[];
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  visible: boolean;
}

export interface MapControls {
  showZoomControls: boolean;
  showMapTypeControls: boolean;
  showStreetViewControls: boolean;
  showFullscreenControls: boolean;
  showTrafficLayer: boolean;
  showTransitLayer: boolean;
  customControls?: {
    position: google.maps.ControlPosition;
    element: HTMLElement;
  }[];
}

export interface HeatmapPoint {
  location: google.maps.LatLng;
  weight?: number;
}

export interface MapAnalytics {
  deliveryDensity: HeatmapPoint[];
  popularRoutes: {
    from: google.maps.LatLngLiteral;
    to: google.maps.LatLngLiteral;
    frequency: number;
  }[];
  averageDeliveryTimes: {
    zone: string;
    averageTime: number; // en minutes
    coordinates: google.maps.LatLngLiteral;
  }[];
  driverPerformance: {
    driverId: string;
    averageSpeed: number;
    deliveriesPerHour: number;
    customerRating: number;
    efficiency: number; // 0-100%
  }[];
}

// Événements de carte
export interface MapEvent {
  type: 'marker_click' | 'route_click' | 'map_click' | 'zoom_changed' | 'center_changed';
  data: any;
  timestamp: Date;
  coordinates?: google.maps.LatLngLiteral;
}

export interface MapSettings {
  defaultCenter: google.maps.LatLngLiteral;
  defaultZoom: number;
  enableGeolocation: boolean;
  enableClustering: boolean;
  clusterOptions?: {
    maxZoom: number;
    gridSize: number;
    styles: any[];
  };
  refreshInterval: number; // millisecondes
  enableRealTimeUpdates: boolean;
  enableOfflineMode: boolean;
}

// Types pour les performances
export interface MapPerformanceMetrics {
  loadTime: number;
  markerCount: number;
  routeCount: number;
  updateFrequency: number;
  memoryUsage?: number;
  lastUpdate: Date;
}

// Configuration des icônes de markers
export const MAP_MARKER_ICONS = {
  driver: {
    online: '/assets/images/markers/driver-online.png',
    offline: '/assets/images/markers/driver-offline.png',
    busy: '/assets/images/markers/driver-busy.png',
    available: '/assets/images/markers/driver-available.png'
  },
  delivery: {
    pending: '/assets/images/markers/delivery-pending.png',
    in_progress: '/assets/images/markers/delivery-progress.png',
    delivered: '/assets/images/markers/delivery-success.png',
    failed: '/assets/images/markers/delivery-failed.png'
  },
  client: {
    active: '/assets/images/markers/client-active.png',
    inactive: '/assets/images/markers/client-inactive.png'
  },
  warehouse: '/assets/images/markers/warehouse.png',
  zone: '/assets/images/markers/zone.png'
};

// Configuration des couleurs de routes
export const ROUTE_COLORS = {
  active: '#3b82f6',      // Bleu - route active
  completed: '#10b981',   // Vert - route terminée
  delayed: '#f59e0b',     // Orange - retard
  failed: '#ef4444',      // Rouge - échec
  optimized: '#8b5cf6'    // Violet - route optimisée
};

// Zones par défaut pour la Tunisie
export const TUNISIA_ZONES = {
  TUNIS: {
    center: { lat: 36.8065, lng: 10.1815 },
    bounds: {
      north: 36.9,
      south: 36.7,
      east: 10.3,
      west: 10.0
    }
  },
  SFAX: {
    center: { lat: 34.7406, lng: 10.7603 },
    bounds: {
      north: 34.8,
      south: 34.7,
      east: 10.8,
      west: 10.7
    }
  },
  SOUSSE: {
    center: { lat: 35.8256, lng: 10.6411 },
    bounds: {
      north: 35.9,
      south: 35.8,
      east: 10.7,
      west: 10.6
    }
  }
};
