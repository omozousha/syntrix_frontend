import {
  type TopologySectionProps,
  TopologyCard,
  toDeviceOptions,
} from "../../sections/device-topology-helpers";
import { ComboboxField } from "../../sections/device-technical-helpers";
import { useTranslate } from "@/lib/use-locale";

export function OltTopologySection(props: TopologySectionProps) {
  const { t } = useTranslate();
  const lookup = props.topologyLookup || {};

  return (
    <TopologyCard title={t("topo.titleOlt")}>
      <ComboboxField
        label="Uplink Switch"
        value={props.form.uplink_switch_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, uplink_switch_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchUplinkSwitch")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectUplinkSwitch"), t)}
      />
      <ComboboxField
        label="Uplink Router"
        value={props.form.uplink_router_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, uplink_router_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchUplinkRouter")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectUplinkRouter"), t)}
      />
    </TopologyCard>
  );
}
