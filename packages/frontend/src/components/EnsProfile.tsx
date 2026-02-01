"use client";

import { useEffect, useState } from "react";
import { getEnsProfile, formatAddressWithEns, type EnsProfile } from "@/lib/ens";

interface EnsProfileCardProps {
  /** Address or ENS name to display */
  addressOrName: string;
  /** Optional: show compact version */
  compact?: boolean;
  /** Optional: show AI agent specific fields */
  showAiFields?: boolean;
}

/**
 * ENS Profile Card Component
 * Displays ENS profile information including custom AI agent records
 * This demonstrates creative use of ENS for DeFi/AI agent discovery
 */
export function EnsProfileCard({
  addressOrName,
  compact = false,
  showAiFields = true,
}: EnsProfileCardProps) {
  const [profile, setProfile] = useState<EnsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      setLoading(true);
      setError(null);
      try {
        const data = await getEnsProfile(addressOrName);
        if (cancelled) return;
        setProfile(data);
        if (!data) {
          setError("No ENS profile found");
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [addressOrName]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading ENS profile...</span>
      </div>
    );
  }

  if (error || !profile) {
    // Show minimal display without ENS
    const addr = addressOrName.startsWith("0x") ? addressOrName : null;
    if (!addr) return null;

    return (
      <div className="flex items-center gap-2 text-slate-400">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">
          🤖
        </div>
        <span className="font-mono text-sm">{`${addr.slice(0, 6)}...${addr.slice(-4)}`}</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt={profile.name || "Avatar"}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
            {profile.name?.charAt(0).toUpperCase() || "?"}
          </div>
        )}
        <div>
          <div className="font-medium text-white">
            {profile.name || formatAddressWithEns(profile.address)}
          </div>
          {profile.name && (
            <div className="text-xs text-slate-400 font-mono">
              {`${profile.address.slice(0, 6)}...${profile.address.slice(-4)}`}
            </div>
          )}
        </div>
        {profile.trustScore && (
          <div className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            Trust: {profile.trustScore}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt={profile.name || "Avatar"}
            className="w-16 h-16 rounded-xl object-cover border border-cyan-500/20"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
            {profile.name?.charAt(0).toUpperCase() || "?"}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white truncate">{profile.name || "Unknown"}</h3>
            {profile.name && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs">
                ENS ✓
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 font-mono truncate">{profile.address}</p>
          {profile.description && (
            <p className="mt-2 text-sm text-slate-300 line-clamp-2">{profile.description}</p>
          )}
        </div>
      </div>

      {/* Social Links */}
      {(profile.twitter || profile.github || profile.url) && (
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-700">
          {profile.twitter && (
            <a
              href={`https://twitter.com/${profile.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          )}
          {profile.github && (
            <a
              href={`https://github.com/${profile.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          )}
          {profile.url && (
            <a
              href={profile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </a>
          )}
        </div>
      )}

      {/* AI Agent Fields - Creative ENS usage */}
      {showAiFields &&
        (profile.aiApiEndpoint || profile.aiServiceCategories || profile.trustScore) && (
          <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
            <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">
              AI Agent Info (ENS Records)
            </div>
            {profile.aiApiEndpoint && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">API:</span>
                <code className="px-2 py-0.5 bg-slate-800 rounded text-cyan-300 text-xs">
                  {profile.aiApiEndpoint}
                </code>
              </div>
            )}
            {profile.aiServiceCategories && (
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="text-slate-400">Services:</span>
                {profile.aiServiceCategories.split(",").map((service, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 text-xs">
                    {service.trim()}
                  </span>
                ))}
              </div>
            )}
            {profile.trustScore && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">Trust Score:</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 text-xs font-semibold">
                  {profile.trustScore}/100
                </span>
              </div>
            )}
          </div>
        )}
    </div>
  );
}

/**
 * Simple ENS name display with tooltip
 */
export function EnsName({ address }: { address: `0x${string}` }) {
  const [ensName, setEnsName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const profile = await getEnsProfile(address);
        if (cancelled) return;
        setEnsName(profile?.name || null);
      } catch {
        if (cancelled) return;
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetch();

    return () => {
      cancelled = true;
    };
  }, [address]);

  if (loading) {
    return (
      <span className="font-mono text-sm text-slate-400">
        {`${address.slice(0, 6)}...${address.slice(-4)}`}
      </span>
    );
  }

  return (
    <span className="font-mono text-sm text-white" title={address}>
      {ensName ? (
        <span className="text-cyan-400">{ensName}</span>
      ) : (
        `${address.slice(0, 6)}...${address.slice(-4)}`
      )}
    </span>
  );
}
