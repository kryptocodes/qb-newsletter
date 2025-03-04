import { useState, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import './App.css'

// Define TypeScript interfaces
interface Grant {
  _id: string
  title: string
  numberOfApplications: number
  acceptingApplications: boolean
  numberOfApplicationsSelected: number
}

interface Section {
  _id: string
  sectionName: string
  sectionLogoIpfsHash: string
  grants: Grant[]
}

interface FundTransfer {
  _id: string
  amount: number
  sender: string
  to: string
  tokenName: string
  tokenUSDValue: number
  createdAt: string
  grant: {
    _id: string
    title: string
    reward: {
      token: {
        label: string
      }
    }
  }
}

interface DomainStats {
  totalProposals: number;
  approvedProposals: number;
  paidAmount: number;
}

// Add new interface for GrantApplication
interface GrantApplication {
  _id: string;
  grant: {
    _id: string;
  };
  milestones: {
    amount: number;
  }[];
}

function App() {
  const [sections, setSections] = useState<Section[]>([])
  const [selectedGrants] = useState<Set<string>>(new Set())
  const [fundTransfers, setFundTransfers] = useState<FundTransfer[]>([])
  const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'overall'>('weekly')
  const [viewMode, setViewMode] = useState<'cards' | 'newsletter'>('cards')
  const [showOnlyAccepting, setShowOnlyAccepting] = useState(false)
  const [grantApplications, setGrantApplications] = useState<GrantApplication[]>([])
  const [isLoadingSections, setIsLoadingSections] = useState(false)
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false)
  const [isLoadingApplications, setIsLoadingApplications] = useState(false)

  // Fetch sections data
  useEffect(() => {
    const fetchSections = async () => {
      setIsLoadingSections(true)
      try {
        const response = await fetch('https://api-grants.questbook.app/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query Sections {
                sections(filter: { _operators: { _id: { in: ["Axelar", "Alchemix", "Arbitrum", "TON Foundation", "Compound", "ENS", "Okto"] } } }) {
                  _id
                  sectionName
                  sectionLogoIpfsHash
                  grants {
                    _id
                    title
                    numberOfApplications
                    acceptingApplications
                    numberOfApplicationsSelected
                  }
                }
              }
            `
          })
        })
        const data = await response.json()
        setSections(data.data.sections)
      } catch (error) {
        console.error('Error fetching sections:', error)
        toast.error('Failed to load sections')
      } finally {
        setIsLoadingSections(false)
      }
    }
    fetchSections()
  }, [])

  // Updated to handle multiple grant selections
  useEffect(() => {
    if (selectedGrants.size === 0) return;

    const fetchFundTransfers = async () => {
      setIsLoadingTransfers(true)
      try {
        const grantIds = Array.from(selectedGrants).map(id => `"${id}"`).join(',');
        const now = Math.floor(Date.now() / 1000);
        const filterDate = new Date();
        if (timeFilter === 'weekly') {
          filterDate.setDate(filterDate.getDate() - 7);
        } else if (timeFilter === 'monthly') {
          filterDate.setMonth(filterDate.getMonth() - 1);
        } else {
          filterDate.setFullYear(filterDate.getFullYear() - 3);
        }
        const fromTimestamp = Math.floor(filterDate.getTime() / 1000);

        const response = await fetch('https://api-grants.questbook.app/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query FundTransfers {
                fundTransfers(
                  limit: 10000,
                  filter: {
                    status: "executed",
                   
                    _operators: { 
                      grant: { in: [${grantIds}] },
                      createdAtS: { 
                        gte: ${fromTimestamp},
                        lte: ${now}
                      } 
                    }
                  }
                ) {
                  _id
                  amount
                  sender
                  to
                  tokenName
                  tokenUSDValue
                  createdAt
                  grant {
                    _id
                    title
                  }
                }
              }
            `
          })
        });
        const data = await response.json();
        setFundTransfers(data.data.fundTransfers);
      } catch (error) {
        console.error('Error fetching transfers:', error)
        toast.error('Failed to load transfers')
      } finally {
        setIsLoadingTransfers(false)
      }
    };

    if (sections.length > 0) {
      fetchFundTransfers();
    }
  }, [sections, selectedGrants, timeFilter]);

  // Update the fetchFundTransfers function to handle empty grant selection
  useEffect(() => {
    const fetchFundTransfers = async () => {
      setIsLoadingTransfers(true)
      try {
        const now = Math.floor(Date.now() / 1000);
        const filterDate = new Date();
        if (timeFilter === 'weekly') {
          filterDate.setDate(filterDate.getDate() - 7);
        } else if (timeFilter === 'monthly') {
          filterDate.setMonth(filterDate.getMonth() - 1);
        } else {
          filterDate.setFullYear(filterDate.getFullYear() - 3);
        }
        const fromTimestamp = Math.floor(filterDate.getTime() / 1000);

        // Get all grant IDs from all sections if no specific grants are selected
        const grantIds = selectedGrants.size > 0
          ? Array.from(selectedGrants)
          : sections.flatMap(section => section.grants.map(grant => grant._id));

        if (grantIds.length === 0) return;

        const grantIdsString = grantIds.map(id => `"${id}"`).join(',');

        const response = await fetch('https://api-grants.questbook.app/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query FundTransfers {
                fundTransfers(
                  limit: 10000,
                  filter: {
                    _operators: { 
                      grant: { in: [${grantIdsString}] },
                      createdAtS: { 
                        gte: ${fromTimestamp},
                        lte: ${now}
                      } 
                    }
                  }
                ) {
                  _id
                  amount
                  sender
                  to
                  tokenName
                  tokenUSDValue
                  createdAt
                  grant {
                    _id
                    title
                      reward {
                         token {
                           label
                      }
                  }
                  }
                }
              }
            `
          })
        });
        const data = await response.json();
        setFundTransfers(data.data.fundTransfers);
      } catch (error) {
        console.error('Error fetching transfers:', error)
        toast.error('Failed to load transfers')
      } finally {
        setIsLoadingTransfers(false)
      }
    };

    // Only fetch if we have sections loaded
    if (sections.length > 0) {
      fetchFundTransfers();
    }
  }, [sections, selectedGrants, timeFilter]);
  // Update the fetchFundTransfers function to also fetch grant applications
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingApplications(true)
      try {
        const now = Math.floor(Date.now() / 1000);
        const filterDate = new Date();
        if (timeFilter === 'weekly') {
          filterDate.setDate(filterDate.getDate() - 7);
        } else if (timeFilter === 'monthly') {
          filterDate.setMonth(filterDate.getMonth() - 1);
        } else {
          filterDate.setFullYear(filterDate.getFullYear() - 3);
        }
        const fromTimestamp = Math.floor(filterDate.getTime() / 1000);
        // Get all grant IDs from all sections if no specific grants are selected
        const grantIds = selectedGrants.size > 0
          ? Array.from(selectedGrants)
          : sections.flatMap(section => section.grants.map(grant => grant._id));

        if (grantIds.length === 0) return;

        const grantIdsString = grantIds.map(id => `"${id}"`).join(',');

        
        
        const applicationsResponse = await fetch('https://api-grants.questbook.app/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query GrantApplications {
                grantApplications(
                  limit: 10000,
                  filter: { 
                    state: "approved", 
                    _operators: { 
                      grant: { in: [${grantIdsString}] },
                      updatedAtS: { 
                        gte: ${fromTimestamp},
                        lte: ${now}
                      }
                    } 
                  }
                ) {
                  _id
                  grant {
                    _id
                  }
                  milestones {
                    amount
                  }
                }
              }
            `
          })
        });
        const applicationsData = await applicationsResponse.json();
        console.log(applicationsData);
        setGrantApplications(applicationsData.data.grantApplications);
      } catch (error) {
        console.error('Error fetching applications:', error)
        toast.error('Failed to load applications')
      } finally {
        setIsLoadingApplications(false)
      }
    };
    // Only fetch if we have sections loaded and grants selected
    if (sections.length > 0) {
      fetchData();
    }
  }, [sections, selectedGrants, timeFilter]); // Removed grantApplications and fundTransfers from dependencies

  const getFilteredTransfers = () => {
    const now = new Date();
    const filterDate = new Date();
    if (timeFilter === 'weekly') {
      filterDate.setDate(now.getDate() - 7);
    } else if (timeFilter === 'monthly') {
      filterDate.setMonth(now.getMonth() - 1);
    } else {
      filterDate.setFullYear(now.getFullYear() - 3);
    }
    return fundTransfers.filter(transfer => new Date(transfer.createdAt) >= filterDate);
  };

  const calculateSectionStats = (section: Section, transfers: FundTransfer[]) => {
    const domainGroups = section.grants.reduce((acc, grant) => {
      const domain = grant.title;
      if (!acc[domain]) {
        acc[domain] = {
          totalProposals: 0,
          approvedProposals: 0,
          paidAmount: 0,
          allocatedAmount: 0,
          tokenLabel: ''
        };
      }

      acc[domain].totalProposals = grant.numberOfApplications || 0;
      acc[domain].approvedProposals = grant.numberOfApplicationsSelected || 0;

      // Calculate paid amount and get token label from transfers
      const grantTransfers = transfers.filter(t => t.grant._id === grant._id);
      acc[domain].paidAmount = grantTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      // Use the first transfer's token label if available
      if (grantTransfers[0]?.grant?.reward?.token?.label) {
        acc[domain].tokenLabel = grantTransfers[0].grant.reward.token.label;
      }

      // Calculate allocated amount from approved applications
      const grantAllocations = grantApplications
        .filter(app => app.grant._id === grant._id)
        .reduce((sum, app) => {
          const milestonesSum = app.milestones.reduce((total, milestone) => total + (Number(milestone.amount) || 0), 0);
          return sum + milestonesSum;
        }, 0);
      
      acc[domain].allocatedAmount = grantAllocations;

      return acc;
    }, {} as Record<string, DomainStats & { tokenLabel: string; allocatedAmount: number }>);

    // Calculate section totals
    const totals = {
      totalProposals: section.grants.reduce((sum, grant) => sum + (grant.numberOfApplications || 0), 0),
      approvedProposals: section.grants.reduce((sum, grant) => sum + (grant.numberOfApplicationsSelected || 0), 0),
      paidAmount: Object.values(domainGroups).reduce((sum, stats) => sum + stats.paidAmount, 0),
      allocatedAmount: Object.values(domainGroups).reduce((sum, stats) => sum + stats.allocatedAmount, 0)
    };

    return { totals, domainGroups };
  };

  // Add helper function to format currency
  const formatCurrency = (amount: number) => {
    return `${(amount / 1000).toFixed(0)}K`;
  };

  // Add this helper function near the other utility functions
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCopyStats = (stats: string) => {
    copyToClipboard(stats);
    toast.success('Stats copied to clipboard!', {
      style: {
        background: '#1E293B',
        color: '#fff',
        borderRadius: '8px',
      },
      iconTheme: {
        primary: '#4F46E5',
        secondary: '#fff',
      },
    });
  };

  const handleCopyAllStats = () => {
    const stats = generateNewsletterStats();
    copyToClipboard(stats);
    toast.success('All stats copied in newsletter format!', {
      style: {
        background: '#1E293B',
        color: '#fff',
        borderRadius: '8px',
      },
      iconTheme: {
        primary: '#4F46E5',
        secondary: '#fff',
      },
    });
  };

  const filteredTransfers = getFilteredTransfers();

  const generateNewsletterStats = () => {
    const now = new Date();
    const period = timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1);
    
    return `📊 Questbook Grants Analytics - ${period} Report (${now.toLocaleDateString()})

${sections.map(section => {
  const sectionStats = calculateSectionStats(section, filteredTransfers);
  const totalUSDValue = filteredTransfers
    .filter(t => t.grant._id === section._id)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return `
🏦 ${section.sectionName} Overview
───────────────────────
📈 Total Proposals: ${sectionStats.totals.totalProposals}
✅ Approved: ${sectionStats.totals.approvedProposals}
💰 Total Paid: ${formatCurrency(sectionStats.totals.paidAmount)}
💵 USD Value: $${formatCurrency(totalUSDValue)}

Domain Breakdown:
${Object.entries(sectionStats.domainGroups)
    .map(([domain, stats]) => 
`• ${domain}
  └─ ${stats.totalProposals} proposals (${stats.approvedProposals} approved)
  └─ ${formatCurrency(stats.paidAmount)} ${stats.tokenLabel} paid`
    ).join('\n')}
`}).join('\n───────────────────────\n')}

Generated via Questbook Analytics Dashboard
https://questbook.app
`;
  };

  // Add this helper function to filter sections based on accepting status
  const getFilteredSections = () => {
    if (!showOnlyAccepting) return sections;
    
    return sections.map(section => ({
      ...section,
      grants: section.grants.filter(grant => grant.acceptingApplications)
    })).filter(section => section.grants.length > 0);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img 
                src="https://substackcdn.com/image/fetch/w_64,h_64,c_fill,f_auto,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F04e766ef-9feb-4fa1-8726-998269792f38_400x400.png"
                alt="Questbook Logo" 
                className="h-8 w-auto"
              />
              <h1 className="ml-4 text-xl font-semibold text-gray-900">Grant Analytics</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Show only accepting</label>
                <button
                  onClick={() => setShowOnlyAccepting(!showOnlyAccepting)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${showOnlyAccepting ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${showOnlyAccepting ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
              <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-4">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all
                    ${viewMode === 'cards' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('newsletter')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all
                    ${viewMode === 'newsletter' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Newsletter
                </button>
              </div>
              {['weekly', 'monthly', 'overall'].map((period) => (
                <button
                  key={period}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${timeFilter === period 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => setTimeFilter(period as 'weekly' | 'monthly' | 'overall')}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoadingSections ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : viewMode === 'newsletter' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Newsletter Format</h2>
              <button
                onClick={handleCopyAllStats}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg 
                  text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 
                  focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Copy All Stats
              </button>
            </div>
            <pre className="bg-gray-50 p-6 rounded-xl overflow-auto whitespace-pre-wrap font-mono text-sm text-gray-800">
              {generateNewsletterStats()}
            </pre>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {getFilteredSections().map(section => {
              const sectionStats = calculateSectionStats(section, filteredTransfers);
              const statsSummary = `
${section.sectionName} Overview
Total Proposals: ${sectionStats.totals.totalProposals}
Approved Proposals: ${sectionStats.totals.approvedProposals}
Total Paid: ${formatCurrency(sectionStats.totals.paidAmount)}

Domain Breakdown:
${Object.entries(sectionStats.domainGroups)
          .map(([domain, stats]) =>
            `${domain}:
  - Proposals: ${stats.totalProposals} (${stats.approvedProposals} approved)
  - Allocated: ${formatCurrency(stats.allocatedAmount)} ${stats.tokenLabel}
  - Paid: ${formatCurrency(stats.paidAmount)} ${stats.tokenLabel}`
          ).join('\n')}`;

              return (
                <div key={section._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  {(isLoadingTransfers || isLoadingApplications) && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        {section.sectionLogoIpfsHash && (
                          <img 
                            src={`https://ipfs.io/ipfs/${section.sectionLogoIpfsHash}`} 
                            alt={section.sectionName} 
                            className="w-12 h-12 rounded-full"
                          />
                        )}
                        <h2 className="text-2xl font-semibold text-gray-900">{section.sectionName}</h2>
                      </div>
                      <button
                        onClick={() => handleCopyStats(statsSummary)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg 
                          text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 
                          focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                      >
                        Copy Stats
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm font-medium text-gray-500">Total Proposals</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {sectionStats.totals.totalProposals.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm font-medium text-gray-500">Approved</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {sectionStats.totals.approvedProposals.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm font-medium text-gray-500">Total Paid</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {formatCurrency(sectionStats.totals.paidAmount)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Domain Breakdown</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(sectionStats.domainGroups).map(([domain, stats]) => (
                          <div key={domain} className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{domain}</h4>
                              {section.grants.find(g => g.title === domain)?.acceptingApplications ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Accepting
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Closed
                                </span>
                              )}
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm text-gray-500">
                                Proposals: <span className="text-gray-900 font-medium">
                                  {stats.totalProposals.toLocaleString()}
                                </span>
                                <span className="text-gray-500">
                                  ({stats.approvedProposals.toLocaleString()} approved)
                                </span>
                              </p>
                              <p className="text-sm text-gray-500">
                                Allocated: <span className="text-gray-900 font-medium">
                                  {formatCurrency(stats.allocatedAmount)}
                                </span>
                                <span className="text-indigo-600 ml-1">{stats.tokenLabel}</span>
                              </p>
                              <p className="text-sm text-gray-500">
                                Paid: <span className="text-gray-900 font-medium">
                                  {formatCurrency(stats.paidAmount)}
                                </span>
                                <span className="text-indigo-600 ml-1">{stats.tokenLabel}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
