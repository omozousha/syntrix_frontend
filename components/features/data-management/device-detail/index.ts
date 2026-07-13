export { DeviceDetailHeader } from "@/components/features/data-management/device-detail/device-detail-header";
export { DeviceFormSelection, type DeviceFormSelectionProps } from "@/components/features/data-management/device-detail/device-form-selection";
export {
  GenericDeviceForm,
  OdcDeviceForm,
  OdpDeviceForm,
  type GenericDeviceFormProps,
  type OdcDeviceFormProps,
  type OdpDeviceFormProps,
} from "@/components/features/data-management/device-detail/forms";
export { DeviceGallerySection } from "@/components/features/data-management/device-detail/device-gallery-section";
export { DeviceOperationalSummary } from "@/components/features/data-management/device-detail/device-operational-summary";
export { DevicePortSummarySection } from "@/components/features/data-management/device-detail/device-port-summary-section";
export { DeviceTechnicalSummarySection } from "@/components/features/data-management/device-detail/device-technical-summary-section";
export { DeviceValidationHistorySection } from "@/components/features/data-management/device-detail/device-validation-history-section";
export { GenericDeviceRawSection } from "@/components/features/data-management/device-detail/generic-device-raw-section";
export {
  OdpCoreChainSummarySection,
  OdpPortMetrics,
} from "@/components/features/data-management/device-detail/odp-core-chain-section";
export {
  OdcCoreChainSummarySection,
  OtbCoreChainSummarySection,
} from "@/components/features/data-management/device-detail/odc-otb-chain-section";
export { OdpOperationsShell } from "@/components/features/data-management/device-detail/odp-operations-shell";
export { OdpPortSection } from "@/components/features/data-management/device-detail/odp-port-section";
export {
  DeviceQrActionPanel,
} from "@/components/features/data-management/device-detail/odp-qr-action-panel";
export {
  OdpFieldValidationSummary,
  OdpInspectionSummary,
  OdpPortSnapshotSummary,
  OdpValidationWorkflowTimeline,
  formatOdpInspectionSummary,
} from "@/components/features/data-management/device-detail/odp-validation-history-sections";
export { OdpValidationHistorySection } from "@/components/features/data-management/device-detail/odp-validation-history-section";
export { ValidationEvidenceAction } from "@/components/features/data-management/device-detail/validation-evidence-action";
export { ValidationReminderDialog } from "@/components/features/data-management/device-detail/validation-reminder-dialog";
export { DeviceTopologyChainVisualizer } from "@/components/features/data-management/device-detail/device-topology-chain-visualizer";
export { DeviceLinkBudgetSection } from "@/components/features/data-management/device-detail/device-link-budget-section";

// ── Fase 2a — Visual Port Tray ───────────────────────────────────────────
export { PortTrayContainer } from "@/components/features/data-management/device-detail/port-tray-container";
export { PortTrayCard } from "@/components/features/data-management/device-detail/port-tray-card";
export { PortTrayBadge } from "@/components/features/data-management/device-detail/port-tray-badge";
export { PortAssignmentDrawer } from "@/components/features/data-management/device-detail/port-assignment-drawer";
export {
  type DevicePort,
  type PortConnection,
  type TrayConfig,
  type TrayLayoutConfig,
  type TrayConfigPayload,
  type FiberColor,
  type PeerDeviceOption,
  type PeerPortOption,
  FIBER_COLORS,
  ODC_TRAY_LAYOUT,
  JC_TRAY_LAYOUT,
  generateTrayLayout,
  generateOltLayout,
  generateSwitchLayout,
  resolveTrayLayout,
  parseTrayConfigFromPayload,
  getFiberColor,
  getPortStatusClass,
  getPortStatusLabel,
  buildConnectionMap,
  groupPortsByTray,
} from "@/components/features/data-management/device-detail/port-tray-types";

// ── Fase 2g — Active Device (OLT/SWITCH) ────────────────────────────────
export { OltPortContainer } from "@/components/features/data-management/device-detail/olt-port-container";
export { OltPortCard } from "@/components/features/data-management/device-detail/olt-port-card";
export { SwitchPortContainer } from "@/components/features/data-management/device-detail/switch-port-container";
export { SwitchPortCard } from "@/components/features/data-management/device-detail/switch-port-card";
