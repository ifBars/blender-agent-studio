param([Parameter(Mandatory=$true)][string]$ConfigurationBase64)
$ErrorActionPreference = 'Stop'
$configuration = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($ConfigurationBase64)) | ConvertFrom-Json
if ($configuration.cpuPercent -lt 1 -or $configuration.cpuPercent -gt 25) { throw 'CPU budget must be 1..25 percent' }
# Launch suspended: no descendant can start before the hard CPU cap is attached.
# The job forbids breakaway; closing this supervisor terminates its owned tree.
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class BlenderResourceJob {
 [StructLayout(LayoutKind.Sequential)] struct CPU { public uint Flags, Rate; }
 [StructLayout(LayoutKind.Sequential)] struct Basic { public long User, Job; public uint Flags; public UIntPtr Min, Max; public uint Active; public UIntPtr Affinity; public uint Priority, Scheduling; }
 [StructLayout(LayoutKind.Sequential)] struct IO { public ulong R,W,O,RB,WB,OB; }
 [StructLayout(LayoutKind.Sequential)] struct Extended { public Basic Basic; public IO IO; public UIntPtr ProcessMemory,JobMemory,PeakProcess,PeakJob; }
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct Startup { public uint Size; public string Reserved,Desktop,Title; public uint X,Y,XS,YS,XC,YC,Fill,Flags; public ushort Show,Reserved2; public IntPtr ReservedPtr,In,Out,Err; }
 [StructLayout(LayoutKind.Sequential)] struct ProcessInfo { public IntPtr Process,Thread; public uint PID,TID; }
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attrs,string name);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int kind,IntPtr info,uint size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcess(string app,StringBuilder cmd,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref Startup startup,out ProcessInfo info);
 [DllImport("kernel32.dll",SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
 [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle,uint ms);
 [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr process,out uint code);
 [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr process,uint code);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int which);
 static void Check(bool ok) { if(!ok) throw new Win32Exception(Marshal.GetLastWin32Error()); }
 static void Set<T>(IntPtr job,int kind,T value) { int size=Marshal.SizeOf(typeof(T));IntPtr ptr=Marshal.AllocHGlobal(size);try{Marshal.StructureToPtr(value,ptr,false);Check(SetInformationJobObject(job,kind,ptr,(uint)size));}finally{Marshal.FreeHGlobal(ptr);} }
 static string Quote(string value) { var s=new StringBuilder("\"");int slashes=0;foreach(char c in value){if(c=='\\'){slashes++;continue;}s.Append('\\',c=='"'?slashes*2+1:slashes);s.Append(c);slashes=0;}s.Append('\\',slashes*2);s.Append('"');return s.ToString(); }
 public static int Run(string executable,string[] args,string cwd,int percent) {
  IntPtr job=CreateJobObject(IntPtr.Zero,null);Check(job!=IntPtr.Zero);ProcessInfo pi=new ProcessInfo();bool started=false;
  try {
   Set(job,9,new Extended{Basic=new Basic{Flags=0x2000|0x20,Priority=0x4000}});
   Set(job,15,new CPU{Flags=1|4,Rate=(uint)(percent*100)});
   var cmd=new StringBuilder(Quote(executable));foreach(string arg in args)cmd.Append(" ").Append(Quote(arg));
   var si=new Startup{Size=(uint)Marshal.SizeOf(typeof(Startup)),Flags=0x100,In=GetStdHandle(-10),Out=GetStdHandle(-11),Err=GetStdHandle(-12)};
   Check(CreateProcess(executable,cmd,IntPtr.Zero,IntPtr.Zero,true,4|0x08000000,IntPtr.Zero,cwd,ref si,out pi));started=true;
   Check(AssignProcessToJobObject(job,pi.Process));if(ResumeThread(pi.Thread)==uint.MaxValue)throw new Win32Exception();
   Console.WriteLine("RESOURCE_JOB pid="+pi.PID+" cpuHardCap="+percent+"% priority=BelowNormal");
   WaitForSingleObject(pi.Process,uint.MaxValue);uint code;Check(GetExitCodeProcess(pi.Process,out code));return unchecked((int)code);
  } catch {if(started)TerminateProcess(pi.Process,1);throw;}
  finally {if(pi.Thread!=IntPtr.Zero)CloseHandle(pi.Thread);if(pi.Process!=IntPtr.Zero)CloseHandle(pi.Process);CloseHandle(job);}
 }
}
'@
$env:BAS_RESOURCE_JOB = 'windows-cpu-hard-cap-v1'
$env:OMP_NUM_THREADS = '2'
$env:OPENBLAS_NUM_THREADS = '2'
$env:MKL_NUM_THREADS = '2'
$command = @($configuration.command)
$executable = (Get-Command -Name $command[0] -CommandType Application -ErrorAction Stop).Source
exit [BlenderResourceJob]::Run($executable, [string[]]$command[1..($command.Length-1)], (Get-Location).Path, [int]$configuration.cpuPercent)
