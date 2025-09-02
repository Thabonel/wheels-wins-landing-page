"""
PAM IoT and Smart Device Connectivity System
Comprehensive integration with IoT devices, smart home systems,
and vehicle/RV monitoring for enhanced travel assistance.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import websockets
import socket
import struct
from zeroconf import ServiceBrowser, ServiceListener, Zeroconf
import paho.mqtt.client as mqtt
from bluetooth import BluetoothError, discover_devices, lookup_name
import serial
import time

from app.core.config import get_settings
from app.services.database import get_database
from app.core.security import generate_device_token, validate_device_token

settings = get_settings()
logger = logging.getLogger(__name__)

class DeviceType(Enum):
    """Types of IoT devices PAM can connect to"""
    # Vehicle/RV Systems
    OBD2_ADAPTER = "obd2_adapter"
    GPS_TRACKER = "gps_tracker"
    TIRE_PRESSURE_MONITOR = "tire_pressure_monitor"
    BATTERY_MONITOR = "battery_monitor"
    SOLAR_CONTROLLER = "solar_controller"
    WATER_TANK_SENSOR = "water_tank_sensor"
    INVERTER = "inverter"
    
    # Smart Home/RV Interior
    SMART_THERMOSTAT = "smart_thermostat"
    SMART_LIGHTS = "smart_lights"
    SMART_LOCK = "smart_lock"
    SECURITY_CAMERA = "security_camera"
    MOTION_SENSOR = "motion_sensor"
    SMOKE_DETECTOR = "smoke_detector"
    
    # Environmental Monitoring
    WEATHER_STATION = "weather_station"
    AIR_QUALITY_SENSOR = "air_quality_sensor"
    SOIL_MOISTURE_SENSOR = "soil_moisture_sensor"
    
    # Communication
    SATELLITE_COMMUNICATOR = "satellite_communicator"
    CELLULAR_BOOSTER = "cellular_booster"
    WIFI_EXTENDER = "wifi_extender"
    
    # Health & Safety
    MEDICAL_DEVICE = "medical_device"
    FITNESS_TRACKER = "fitness_tracker"
    EMERGENCY_BEACON = "emergency_beacon"

class ConnectionProtocol(Enum):
    """Communication protocols for IoT devices"""
    WIFI = "wifi"
    BLUETOOTH = "bluetooth"
    ZIGBEE = "zigbee"
    ZWAVE = "zwave"
    MQTT = "mqtt"
    SERIAL = "serial"
    USB = "usb"
    CAN_BUS = "can_bus"
    MODBUS = "modbus"
    HTTP_REST = "http_rest"
    WEBSOCKET = "websocket"
    LORA = "lora"
    SATELLITE = "satellite"

class DeviceStatus(Enum):
    """Device connection and operational status"""
    ONLINE = "online"
    OFFLINE = "offline"
    CONNECTING = "connecting"
    ERROR = "error"
    MAINTENANCE = "maintenance"
    LOW_BATTERY = "low_battery"
    UNREACHABLE = "unreachable"

@dataclass
class IoTDevice:
    """IoT device representation"""
    device_id: str
    device_type: DeviceType
    name: str
    manufacturer: str
    model: str
    firmware_version: str
    connection_protocol: ConnectionProtocol
    connection_details: Dict[str, Any]
    capabilities: List[str]
    sensors: List[str]
    actuators: List[str]
    status: DeviceStatus
    last_seen: datetime
    battery_level: Optional[float]
    signal_strength: Optional[float]
    location: Optional[Dict[str, float]]
    metadata: Dict[str, Any]
    user_id: str

@dataclass
class DeviceReading:
    """Sensor reading from IoT device"""
    reading_id: str
    device_id: str
    sensor_type: str
    value: Union[float, int, str, bool]
    unit: Optional[str]
    timestamp: datetime
    quality: float  # 0-1 confidence in reading
    metadata: Dict[str, Any]

@dataclass
class DeviceAlert:
    """Alert generated from device data"""
    alert_id: str
    device_id: str
    alert_type: str
    severity: str  # low, medium, high, critical
    title: str
    description: str
    recommendations: List[str]
    triggered_at: datetime
    resolved_at: Optional[datetime]
    metadata: Dict[str, Any]

@dataclass
class AutomationRule:
    """Automation rule for device interactions"""
    rule_id: str
    name: str
    description: str
    trigger_conditions: List[Dict[str, Any]]
    actions: List[Dict[str, Any]]
    is_active: bool
    user_id: str
    created_at: datetime
    last_triggered: Optional[datetime]

class PAMIoTDeviceSystem:
    """
    Comprehensive IoT device integration system for PAM.
    
    Features:
    - Multi-protocol device discovery and connection
    - Real-time sensor data collection and monitoring
    - Vehicle diagnostics and RV system monitoring
    - Smart home automation and control
    - Environmental monitoring and alerts
    - Predictive maintenance and health monitoring
    - Location-based automation and geofencing
    - Energy management and solar monitoring
    - Security and safety monitoring
    """
    
    def __init__(self):
        self.db = get_database()
        self.session = None
        
        # Connected devices registry
        self.connected_devices: Dict[str, IoTDevice] = {}
        self.device_connections: Dict[str, Any] = {}
        self.device_callbacks: Dict[str, List[Callable]] = {}
        
        # Protocol handlers
        self.protocol_handlers = {}
        
        # Device discovery services
        self.zeroconf = None
        self.mqtt_client = None
        self.bluetooth_scanner = None
        
        # Automation engine
        self.automation_rules: Dict[str, AutomationRule] = {}
        
        # Device type configurations
        self.device_configs = {
            DeviceType.OBD2_ADAPTER: {
                "protocols": [ConnectionProtocol.BLUETOOTH, ConnectionProtocol.WIFI, ConnectionProtocol.SERIAL],
                "sensors": ["engine_rpm", "speed", "fuel_level", "coolant_temp", "battery_voltage"],
                "update_frequency": 5,  # seconds
                "critical_alerts": ["engine_temp_high", "low_fuel", "check_engine"]
            },
            DeviceType.GPS_TRACKER: {
                "protocols": [ConnectionProtocol.CELLULAR, ConnectionProtocol.SATELLITE, ConnectionProtocol.WIFI],
                "sensors": ["latitude", "longitude", "altitude", "speed", "heading"],
                "update_frequency": 60,
                "critical_alerts": ["geofence_breach", "speed_limit_exceeded", "sos_activated"]
            },
            DeviceType.BATTERY_MONITOR: {
                "protocols": [ConnectionProtocol.BLUETOOTH, ConnectionProtocol.SERIAL, ConnectionProtocol.MODBUS],
                "sensors": ["voltage", "current", "capacity", "temperature", "state_of_charge"],
                "update_frequency": 30,
                "critical_alerts": ["low_battery", "overcharge", "high_temperature"]
            },
            DeviceType.SOLAR_CONTROLLER: {
                "protocols": [ConnectionProtocol.MODBUS, ConnectionProtocol.SERIAL, ConnectionProtocol.WIFI],
                "sensors": ["solar_voltage", "solar_current", "battery_voltage", "load_current"],
                "actuators": ["load_control", "charging_control"],
                "update_frequency": 60,
                "critical_alerts": ["charging_fault", "overload", "battery_low"]
            },
            DeviceType.WATER_TANK_SENSOR: {
                "protocols": [ConnectionProtocol.WIFI, ConnectionProtocol.BLUETOOTH, ConnectionProtocol.ZIGBEE],
                "sensors": ["water_level", "temperature"],
                "update_frequency": 300,  # 5 minutes
                "critical_alerts": ["low_water", "tank_empty", "sensor_fault"]
            },
            DeviceType.SMART_THERMOSTAT: {
                "protocols": [ConnectionProtocol.WIFI, ConnectionProtocol.ZIGBEE],
                "sensors": ["temperature", "humidity", "occupancy"],
                "actuators": ["heating", "cooling", "fan"],
                "update_frequency": 120,
                "critical_alerts": ["extreme_temperature", "hvac_fault"]
            }
        }
        
        # Initialize IoT system
        asyncio.create_task(self._initialize_iot_system())
    
    async def _initialize_iot_system(self):
        """Initialize IoT device system"""
        try:
            # Create HTTP session
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30),
                headers={"User-Agent": "PAM-IoT-Assistant/1.0"}
            )
            
            # Initialize protocol handlers
            await self._initialize_protocol_handlers()
            
            # Start device discovery services
            await self._start_discovery_services()
            
            # Load existing device connections
            await self._load_device_connections()
            
            # Start automation engine
            await self._start_automation_engine()
            
            logger.info("IoT device system initialized")
            
        except Exception as e:
            logger.error(f"Error initializing IoT system: {e}")
    
    async def discover_devices(
        self,
        user_id: str,
        protocols: Optional[List[ConnectionProtocol]] = None,
        timeout: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Discover available IoT devices on the network.
        
        Args:
            user_id: User identifier
            protocols: Optional list of protocols to scan
            timeout: Discovery timeout in seconds
            
        Returns:
            List of discovered devices
        """
        try:
            if not protocols:
                protocols = [
                    ConnectionProtocol.WIFI,
                    ConnectionProtocol.BLUETOOTH,
                    ConnectionProtocol.MQTT,
                    ConnectionProtocol.SERIAL
                ]
            
            discovered_devices = []
            
            # Run discovery for each protocol concurrently
            discovery_tasks = []
            for protocol in protocols:
                task = self._discover_protocol_devices(protocol, timeout)
                discovery_tasks.append(task)
            
            # Wait for all discoveries to complete
            protocol_results = await asyncio.gather(*discovery_tasks, return_exceptions=True)
            
            # Combine results
            for i, result in enumerate(protocol_results):
                if isinstance(result, Exception):
                    logger.error(f"Error discovering {protocols[i]} devices: {result}")
                    continue
                
                if result:
                    discovered_devices.extend(result)
            
            # Filter duplicates and classify devices
            unique_devices = {}
            for device_info in discovered_devices:
                device_key = f"{device_info.get('mac_address', '')}{device_info.get('ip_address', '')}"
                if device_key not in unique_devices:
                    # Classify device type
                    device_type = await self._classify_device_type(device_info)
                    device_info["classified_type"] = device_type.value if device_type else "unknown"
                    
                    unique_devices[device_key] = device_info
            
            # Store discovery results
            await self._store_discovery_results(user_id, list(unique_devices.values()))
            
            return list(unique_devices.values())
            
        except Exception as e:
            logger.error(f"Error discovering devices: {e}")
            return []
    
    async def connect_device(
        self,
        user_id: str,
        device_info: Dict[str, Any],
        connection_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Connect to a discovered IoT device.
        
        Args:
            user_id: User identifier
            device_info: Device information from discovery
            connection_params: Optional connection parameters
            
        Returns:
            Connection result
        """
        try:
            # Validate device information
            if not self._validate_device_info(device_info):
                return {"success": False, "error": "Invalid device information"}
            
            # Determine connection protocol
            protocol = ConnectionProtocol(device_info.get("protocol", "wifi"))
            
            # Attempt connection using appropriate handler
            connection_result = await self._connect_via_protocol(
                protocol, device_info, connection_params or {}
            )
            
            if not connection_result["success"]:
                return connection_result
            
            # Create device object
            device = IoTDevice(
                device_id=self._generate_device_id(device_info),
                device_type=DeviceType(device_info.get("classified_type", "unknown")),
                name=device_info.get("name", "Unknown Device"),
                manufacturer=device_info.get("manufacturer", "Unknown"),
                model=device_info.get("model", "Unknown"),
                firmware_version=device_info.get("firmware_version", "Unknown"),
                connection_protocol=protocol,
                connection_details=connection_result["connection_details"],
                capabilities=device_info.get("capabilities", []),
                sensors=device_info.get("sensors", []),
                actuators=device_info.get("actuators", []),
                status=DeviceStatus.ONLINE,
                last_seen=datetime.utcnow(),
                battery_level=device_info.get("battery_level"),
                signal_strength=device_info.get("signal_strength"),
                location=device_info.get("location"),
                metadata=device_info.get("metadata", {}),
                user_id=user_id
            )
            
            # Store device connection
            await self._store_device_connection(device)
            
            # Add to connected devices
            self.connected_devices[device.device_id] = device
            self.device_connections[device.device_id] = connection_result["connection"]
            
            # Start monitoring device
            await self._start_device_monitoring(device)
            
            # Send welcome message to device (if supported)
            await self._send_device_welcome(device)
            
            return {
                "success": True,
                "device_id": device.device_id,
                "device": asdict(device),
                "message": f"Successfully connected to {device.name}"
            }
            
        except Exception as e:
            logger.error(f"Error connecting device: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_device_data(
        self,
        device_id: str,
        sensor_types: Optional[List[str]] = None,
        time_range: Optional[Tuple[datetime, datetime]] = None
    ) -> Dict[str, Any]:
        """
        Get sensor data from a connected device.
        
        Args:
            device_id: Device identifier
            sensor_types: Optional specific sensors to query
            time_range: Optional time range for historical data
            
        Returns:
            Device sensor data
        """
        try:
            if device_id not in self.connected_devices:
                return {"error": "Device not connected"}
            
            device = self.connected_devices[device_id]
            
            # Get real-time data
            if not time_range:
                real_time_data = await self._get_real_time_data(device, sensor_types)
                return {
                    "device_id": device_id,
                    "device_name": device.name,
                    "status": device.status.value,
                    "last_seen": device.last_seen.isoformat(),
                    "data": real_time_data,
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            # Get historical data
            historical_data = await self._get_historical_data(device_id, sensor_types, time_range)
            
            return {
                "device_id": device_id,
                "device_name": device.name,
                "time_range": {
                    "start": time_range[0].isoformat(),
                    "end": time_range[1].isoformat()
                },
                "historical_data": historical_data,
                "retrieved_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting device data: {e}")
            return {"error": str(e)}
    
    async def control_device(
        self,
        device_id: str,
        action: str,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send control command to device.
        
        Args:
            device_id: Device identifier
            action: Action to perform
            parameters: Optional action parameters
            
        Returns:
            Command execution result
        """
        try:
            if device_id not in self.connected_devices:
                return {"success": False, "error": "Device not connected"}
            
            device = self.connected_devices[device_id]
            
            # Validate action is supported
            if action not in device.actuators and action not in device.capabilities:
                return {
                    "success": False,
                    "error": f"Action '{action}' not supported by device"
                }
            
            # Execute command based on device protocol
            result = await self._execute_device_command(device, action, parameters or {})
            
            # Log command execution
            await self._log_device_command(device_id, action, parameters, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error controlling device: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_automation_rule(
        self,
        user_id: str,
        rule_name: str,
        description: str,
        triggers: List[Dict[str, Any]],
        actions: List[Dict[str, Any]]
    ) -> AutomationRule:
        """
        Create automation rule for IoT devices.
        
        Args:
            user_id: User identifier
            rule_name: Name of the automation rule
            description: Rule description
            triggers: List of trigger conditions
            actions: List of actions to execute
            
        Returns:
            Created automation rule
        """
        try:
            rule_id = f"rule_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            # Validate triggers and actions
            validation_result = await self._validate_automation_rule(triggers, actions, user_id)
            if not validation_result["valid"]:
                raise ValueError(f"Invalid automation rule: {validation_result['reason']}")
            
            # Create automation rule
            automation_rule = AutomationRule(
                rule_id=rule_id,
                name=rule_name,
                description=description,
                trigger_conditions=triggers,
                actions=actions,
                is_active=True,
                user_id=user_id,
                created_at=datetime.utcnow(),
                last_triggered=None
            )
            
            # Store rule
            await self._store_automation_rule(automation_rule)
            
            # Add to active rules
            self.automation_rules[rule_id] = automation_rule
            
            return automation_rule
            
        except Exception as e:
            logger.error(f"Error creating automation rule: {e}")
            raise
    
    async def get_device_alerts(
        self,
        user_id: str,
        device_id: Optional[str] = None,
        severity: Optional[str] = None,
        unresolved_only: bool = True
    ) -> List[DeviceAlert]:
        """
        Get device alerts and notifications.
        
        Args:
            user_id: User identifier
            device_id: Optional specific device
            severity: Optional severity filter
            unresolved_only: Whether to return only unresolved alerts
            
        Returns:
            List of device alerts
        """
        try:
            # Build query conditions
            conditions = ["user_id = $1"]
            params = [user_id]
            param_count = 1
            
            if device_id:
                param_count += 1
                conditions.append(f"device_id = ${param_count}")
                params.append(device_id)
            
            if severity:
                param_count += 1
                conditions.append(f"severity = ${param_count}")
                params.append(severity)
            
            if unresolved_only:
                conditions.append("resolved_at IS NULL")
            
            # Query alerts
            query = f"""
            SELECT * FROM pam_device_alerts 
            WHERE {' AND '.join(conditions)}
            ORDER BY triggered_at DESC
            """
            
            results = await self.db.fetch(query, *params)
            
            # Convert to DeviceAlert objects
            alerts = []
            for row in results:
                alert = DeviceAlert(
                    alert_id=row["alert_id"],
                    device_id=row["device_id"],
                    alert_type=row["alert_type"],
                    severity=row["severity"],
                    title=row["title"],
                    description=row["description"],
                    recommendations=json.loads(row["recommendations"]),
                    triggered_at=row["triggered_at"],
                    resolved_at=row["resolved_at"],
                    metadata=json.loads(row["metadata"])
                )
                alerts.append(alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error getting device alerts: {e}")
            return []
    
    # Private methods for protocol implementations
    
    async def _discover_protocol_devices(
        self,
        protocol: ConnectionProtocol,
        timeout: int
    ) -> List[Dict[str, Any]]:
        """Discover devices for a specific protocol"""
        try:
            if protocol == ConnectionProtocol.WIFI:
                return await self._discover_wifi_devices(timeout)
            elif protocol == ConnectionProtocol.BLUETOOTH:
                return await self._discover_bluetooth_devices(timeout)
            elif protocol == ConnectionProtocol.MQTT:
                return await self._discover_mqtt_devices(timeout)
            elif protocol == ConnectionProtocol.SERIAL:
                return await self._discover_serial_devices()
            elif protocol == ConnectionProtocol.USB:
                return await self._discover_usb_devices()
            else:
                logger.warning(f"Discovery not implemented for protocol: {protocol}")
                return []
                
        except Exception as e:
            logger.error(f"Error discovering {protocol} devices: {e}")
            return []
    
    async def _discover_wifi_devices(self, timeout: int) -> List[Dict[str, Any]]:
        """Discover WiFi/mDNS devices"""
        try:
            discovered = []
            
            # Use zeroconf for mDNS discovery
            if not self.zeroconf:
                self.zeroconf = Zeroconf()
            
            # Common IoT service types
            service_types = [
                "_http._tcp.local.",
                "_https._tcp.local.",
                "_iot._tcp.local.",
                "_mqtt._tcp.local.",
                "_ipp._tcp.local.",
                "_airplay._tcp.local.",
                "_homekit._tcp.local."
            ]
            
            # Discover services
            for service_type in service_types:
                services = self.zeroconf.get_service_info(service_type, timeout=timeout)
                if services:
                    for service in services:
                        device_info = {
                            "protocol": "wifi",
                            "name": service.name,
                            "ip_address": socket.inet_ntoa(service.addresses[0]) if service.addresses else None,
                            "port": service.port,
                            "service_type": service_type,
                            "properties": service.properties
                        }
                        discovered.append(device_info)
            
            # Network scanning for additional devices
            network_devices = await self._scan_network_devices()
            discovered.extend(network_devices)
            
            return discovered
            
        except Exception as e:
            logger.error(f"Error discovering WiFi devices: {e}")
            return []
    
    async def _discover_bluetooth_devices(self, timeout: int) -> List[Dict[str, Any]]:
        """Discover Bluetooth devices"""
        try:
            discovered = []
            
            # Discover nearby Bluetooth devices
            nearby_devices = discover_devices(duration=timeout, lookup_names=True)
            
            for address, name in nearby_devices:
                device_info = {
                    "protocol": "bluetooth",
                    "name": name or f"BT Device {address}",
                    "mac_address": address,
                    "device_class": None  # Could be determined with more detailed scanning
                }
                
                # Try to get additional device information
                try:
                    # This would require more sophisticated Bluetooth inquiry
                    pass
                except BluetoothError:
                    pass
                
                discovered.append(device_info)
            
            return discovered
            
        except Exception as e:
            logger.error(f"Error discovering Bluetooth devices: {e}")
            return []
    
    async def _discover_serial_devices(self) -> List[Dict[str, Any]]:
        """Discover serial/USB devices"""
        try:
            import serial.tools.list_ports
            
            discovered = []
            ports = serial.tools.list_ports.comports()
            
            for port in ports:
                device_info = {
                    "protocol": "serial",
                    "name": f"{port.description} ({port.device})",
                    "port": port.device,
                    "manufacturer": port.manufacturer,
                    "product": port.product,
                    "serial_number": port.serial_number,
                    "vid": port.vid,
                    "pid": port.pid
                }
                
                # Try to identify device type based on VID/PID
                device_type = self._identify_serial_device_type(port.vid, port.pid)
                if device_type:
                    device_info["classified_type"] = device_type.value
                
                discovered.append(device_info)
            
            return discovered
            
        except Exception as e:
            logger.error(f"Error discovering serial devices: {e}")
            return []
    
    async def _classify_device_type(self, device_info: Dict[str, Any]) -> Optional[DeviceType]:
        """Classify device type based on discovery information"""
        try:
            name = device_info.get("name", "").lower()
            manufacturer = device_info.get("manufacturer", "").lower()
            service_type = device_info.get("service_type", "").lower()
            
            # OBD2 adapters
            if any(term in name for term in ["obd", "elm327", "torque", "car scanner"]):
                return DeviceType.OBD2_ADAPTER
            
            # GPS trackers
            if any(term in name for term in ["gps", "tracker", "garmin", "tomtom"]):
                return DeviceType.GPS_TRACKER
            
            # Battery monitors
            if any(term in name for term in ["battery", "victron", "mastervolt", "enerdrive"]):
                return DeviceType.BATTERY_MONITOR
            
            # Solar controllers
            if any(term in name for term in ["solar", "mppt", "controller", "renogy"]):
                return DeviceType.SOLAR_CONTROLLER
            
            # Thermostats
            if any(term in name for term in ["thermostat", "nest", "ecobee", "honeywell"]):
                return DeviceType.SMART_THERMOSTAT
            
            # Smart lights
            if any(term in name for term in ["light", "bulb", "philips hue", "lifx"]):
                return DeviceType.SMART_LIGHTS
            
            # Water sensors
            if any(term in name for term in ["water", "tank", "level", "moisture"]):
                return DeviceType.WATER_TANK_SENSOR
            
            # Weather stations
            if any(term in name for term in ["weather", "station", "davis", "ambient"]):
                return DeviceType.WEATHER_STATION
            
            return None
            
        except Exception as e:
            logger.error(f"Error classifying device type: {e}")
            return None
    
    async def _start_device_monitoring(self, device: IoTDevice):
        """Start monitoring a connected device"""
        try:
            # Create monitoring task for device
            task = asyncio.create_task(self._monitor_device_loop(device))
            
            # Store task reference (for cleanup)
            if not hasattr(self, 'monitoring_tasks'):
                self.monitoring_tasks = {}
            self.monitoring_tasks[device.device_id] = task
            
        except Exception as e:
            logger.error(f"Error starting device monitoring: {e}")
    
    async def _monitor_device_loop(self, device: IoTDevice):
        """Main monitoring loop for a device"""
        try:
            config = self.device_configs.get(device.device_type, {})
            update_frequency = config.get("update_frequency", 60)
            
            while device.device_id in self.connected_devices:
                try:
                    # Get sensor readings
                    readings = await self._collect_device_readings(device)
                    
                    # Store readings
                    for reading in readings:
                        await self._store_device_reading(reading)
                    
                    # Check for alerts
                    alerts = await self._check_device_alerts(device, readings)
                    for alert in alerts:
                        await self._process_device_alert(alert)
                    
                    # Update device status
                    device.last_seen = datetime.utcnow()
                    device.status = DeviceStatus.ONLINE
                    
                    # Check automation rules
                    await self._check_automation_triggers(device, readings)
                    
                    await asyncio.sleep(update_frequency)
                    
                except Exception as e:
                    logger.error(f"Error in device monitoring loop: {e}")
                    device.status = DeviceStatus.ERROR
                    await asyncio.sleep(update_frequency)
                    
        except asyncio.CancelledError:
            logger.info(f"Monitoring cancelled for device {device.device_id}")
        except Exception as e:
            logger.error(f"Error in device monitoring: {e}")


# Global IoT device system instance
iot_device_system = PAMIoTDeviceSystem()

# Utility functions for easy integration

async def discover_iot_devices(
    user_id: str,
    protocols: List[str] = None,
    timeout: int = 30
) -> List[Dict[str, Any]]:
    """Convenience function for device discovery"""
    connection_protocols = [ConnectionProtocol(p) for p in protocols] if protocols else None
    return await iot_device_system.discover_devices(
        user_id=user_id,
        protocols=connection_protocols,
        timeout=timeout
    )

async def connect_iot_device(
    user_id: str,
    device_info: Dict[str, Any],
    connection_params: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Convenience function for device connection"""
    return await iot_device_system.connect_device(
        user_id=user_id,
        device_info=device_info,
        connection_params=connection_params
    )

async def get_iot_device_data(
    device_id: str,
    sensors: List[str] = None,
    hours_back: int = 24
) -> Dict[str, Any]:
    """Convenience function for getting device data"""
    time_range = None
    if hours_back:
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours_back)
        time_range = (start_time, end_time)
    
    return await iot_device_system.get_device_data(
        device_id=device_id,
        sensor_types=sensors,
        time_range=time_range
    )

async def control_iot_device(
    device_id: str,
    action: str,
    params: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Convenience function for device control"""
    return await iot_device_system.control_device(
        device_id=device_id,
        action=action,
        parameters=params
    )