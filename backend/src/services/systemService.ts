import os from 'os';
import si from 'systeminformation';

export interface CpuInfo {
  model: string;
  cores: number;
  physicalCores: number;
  speed: number;       // GHz
  usagePercent: number;
}

export interface MemInfo {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
}

export interface DiskInfo {
  fs: string;
  mount: string;
  totalBytes: number;
  usedBytes: number;
  usagePercent: number;
}

export interface NetInfo {
  iface: string;
  rxBytesPerSec: number;
  txBytesPerSec: number;
  rxTotalBytes: number;
  txTotalBytes: number;
}

export interface SystemStats {
  hostname:   string;
  platform:   string;
  distro:     string;
  release:    string;
  arch:       string;
  uptimeSeconds: number;
  cpu:        CpuInfo;
  mem:        MemInfo;
  disks:      DiskInfo[];
  net:        NetInfo[];
  collectedAt: string;
}

export async function getSystemStats(): Promise<SystemStats> {
  const [
    cpuData,
    cpuLoad,
    memData,
    disksData,
    netStats,
    osInfo,
  ] = await Promise.all([
    si.cpu(),
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.osInfo(),
  ]);

  const cpu: CpuInfo = {
    model:         cpuData.brand || cpuData.manufacturer,
    cores:         cpuData.cores,
    physicalCores: cpuData.physicalCores,
    speed:         cpuData.speed,
    usagePercent:  Math.round(cpuLoad.currentLoad),
  };

  const mem: MemInfo = {
    totalBytes:   memData.total,
    usedBytes:    memData.active,
    freeBytes:    memData.available,
    usagePercent: Math.round((memData.active / memData.total) * 100),
  };

  const disks: DiskInfo[] = disksData
    .filter((d) => d.size > 0)
    .map((d) => ({
      fs:           d.fs,
      mount:        d.mount,
      totalBytes:   d.size,
      usedBytes:    d.used,
      usagePercent: Math.round(d.use),
    }));

  const net: NetInfo[] = (Array.isArray(netStats) ? netStats : [netStats])
    .filter((n) => n.iface && n.rx_sec !== undefined)
    .slice(0, 4)
    .map((n) => ({
      iface:          n.iface,
      rxBytesPerSec:  Math.max(0, Math.round(n.rx_sec ?? 0)),
      txBytesPerSec:  Math.max(0, Math.round(n.tx_sec ?? 0)),
      rxTotalBytes:   n.rx_bytes ?? 0,
      txTotalBytes:   n.tx_bytes ?? 0,
    }));

  return {
    hostname:      osInfo.hostname || os.hostname(),
    platform:      osInfo.platform || os.platform(),
    distro:        osInfo.distro || os.type(),
    release:       osInfo.release || os.release(),
    arch:          osInfo.arch || os.arch(),
    uptimeSeconds: Math.round(os.uptime()),
    cpu,
    mem,
    disks,
    net,
    collectedAt:   new Date().toISOString(),
  };
}
