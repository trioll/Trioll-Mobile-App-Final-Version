
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Animated, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Line, Text as SvgText, Circle } from 'react-native-svg';
import { useHaptics } from '../../hooks/useHaptics';
import { DURATIONS } from '../../constants/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface RevenueData {
  date: string;
  amount: number;
}

interface PayoutHistory {
  id: string;
  date: Date;
  amount: number;
  status: PayoutStatus;
  method: string;
  reference: string;
}

interface TaxDocument {
  id: string;
  type: string;
  year: number;
  status: 'available' | 'processing';
  downloadUrl?: string;
}

interface PaymentMethod {
  id: string;
  type: 'bank' | 'paypal' | 'stripe';
  name: string;
  details: string;
  isDefault: boolean;
}

export const Monetization: React.FC = () => {
  const navigation = useNavigation();
  const haptics = useHaptics();

  // const [refreshing] = useState(false); // For future refresh control
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'settings' | 'tax'>(
    'overview'
  );
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'ytd'>('30d');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const chartAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  // Mock data
  const [currentBalance] = useState(8420.5);
  const [pendingRevenue] = useState(1250.3);
  const [lifetimeEarnings] = useState(42580.75);
  const [minimumPayout] = useState(100);

  const [revenueData] = useState<RevenueData[]>([
    { date: '1', amount: 280 },
    { date: '5', amount: 350 },
    { date: '10', amount: 420 },
    { date: '15', amount: 380 },
    { date: '20', amount: 450 },
    { date: '25', amount: 520 },
    { date: '30', amount: 480 },
  ]);

  const [payoutHistory] = useState<PayoutHistory[]>([
    {
      id: '1',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      amount: 2500,
      status: 'completed',
      method: 'Bank Transfer',
      reference: 'PAY-2024-001',
    },
    {
      id: '2',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      amount: 3200,
      status: 'completed',
      method: 'Bank Transfer',
      reference: 'PAY-2024-002',
    },
    {
      id: '3',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      amount: 1850,
      status: 'processing',
      method: 'PayPal',
      reference: 'PAY-2024-003',
    },
  ]);

  const [taxDocuments] = useState<TaxDocument[]>([
    {
      id: '1',
      type: '1099-MISC',
      year: 2023,
      status: 'available',
      downloadUrl: '#',
    },
    {
      id: '2',
      type: 'W-9',
      year: 2024,
      status: 'available',
      downloadUrl: '#',
    },
  ]);

  const [paymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'bank',
      name: 'Chase Bank',
      details: '****1234',
      isDefault: true,
    },
    {
      id: '2',
      type: 'paypal',
      name: 'PayPal',
      details: 'dev@example.com',
      isDefault: false,
    },
  ]);

  const [revenueShare] = useState({
    developer: 70,
    platform: 30,
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATIONS.NORMAL,
        useNativeDriver: true,
      }),
      Animated.timing(chartAnim, {
        toValue: 1,
        duration: DURATIONS.SLOW,
        delay: DURATIONS.FAST,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getScaleAnim = (id: string) => {
    if (!scaleAnims[id]) {
      scaleAnims[id] = new Animated.Value(1);
    }
    return scaleAnims[id];
  };

  // const handleRefresh = () => {
  //   setRefreshing(true);
  //   setTimeout(() => {
  //     setRefreshing(false);
  //     (haptics as any).success();
  //   }, 1500);
  // };

  const handleRequestPayout = () => {
    if (currentBalance < minimumPayout) {
      Alert.alert(
        'Insufficient Balance',
        `Minimum payout amount is $${minimumPayout}. Your current balance is $${currentBalance.toFixed(2)}.`
      );
      return;
    }

    haptics.impact('medium');
    Alert.alert('Request Payout', `Request payout of $${currentBalance.toFixed(2)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => {
          (haptics as any).success();
          Alert.alert(
            'Success',
            "Payout request submitted. You'll receive funds within 3-5 business days."
          );
        },
      },
    ]);
  };

  const renderRevenueChart = () => {
    const maxValue = Math.max(...revenueData.map(d => d.amount));
    const chartHeight = 200;
    const chartWidth = SCREEN_WIDTH - 48;
    const padding = 20;

    const points = revenueData.map((item, index) => {
      const x = (index / (revenueData.length - 1)) * (chartWidth - padding * 2) + padding;
      const y = chartHeight - (item.amount / maxValue) * (chartHeight - padding * 2) - padding;
      return { x, y };
    });

    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`)
      .join(' ');

    return (
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <Line
              key={ratio}
              x1={padding}
              y1={chartHeight - padding - ratio * (chartHeight - padding * 2)}
              x2={chartWidth - padding}
              y2={chartHeight - padding - ratio * (chartHeight - padding * 2)}
              stroke="#1a1a1a"
              strokeWidth="1"
            />
          ))}

          {/* Revenue line */}
          <Path
            d={pathData}
            stroke="#00FF88"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Gradient fill */}
          <Path
            d={`${pathData} L ${points[points.length - 1].x},${chartHeight - padding} L ${padding},${chartHeight - padding} Z`}
            fill="url(#revenueGradient)"
            opacity="0.2"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#00FF88"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          ))}

          {/* Labels */}
          {revenueData.map((item, index) => (
            <SvgText
              key={index}
              x={(index / (revenueData.length - 1)) * (chartWidth - padding * 2) + padding}
              y={chartHeight - 5}
              fill="#666"
              fontSize="12"
              textAnchor="middle"
            >
              {item.date}
            </SvgText>
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00FF88" />
              <stop offset="100%" stopColor="#00FF88" stopOpacity="0" />
            </linearGradient>
          </defs>
        </Svg>
      </View>
    );
  };

  const renderOverview = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.overviewContent}>
        {/* Balance Cards */}
        <View style={styles.balanceContainer}>
          <LinearGradient
            colors={['#00FF88', '#00CC70']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>${currentBalance.toFixed(2)}</Text>
            <Pressable onPress={handleRequestPayout} style={styles.payoutButton}>
              <Text style={styles.payoutButtonText}>Request Payout</Text>
              <Ionicons name="arrow-forward" size={16} color="#000" />
            </Pressable>
          </LinearGradient>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Pending Revenue</Text>
              <Text style={styles.statValue}>${pendingRevenue.toFixed(2)}</Text>
              <Text style={styles.statHint}>Processing</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Lifetime Earnings</Text>
              <Text style={styles.statValue}>${lifetimeEarnings.toFixed(0)}</Text>
              <Text style={styles.statHint}>All time</Text>
            </View>
          </View>
        </View>

        {/* Revenue Chart */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>Revenue Overview</Text>
            <View style={styles.timeRangeSelector}>
              {(['7d', '30d', '90d', 'ytd'] as const).map(range => (
                <Pressable
                  key={range}
                  onPress={() => {
                    haptics.selection();
                    setTimeRange(range);
                  }}
                  style={[
                    styles.timeRangeButton,
                    timeRange === range && styles.timeRangeButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.timeRangeText,
                      timeRange === range && styles.timeRangeTextActive,
                    ]}
                  >
                    {range.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Animated.View style={{ opacity: chartAnim }}>{renderRevenueChart()}</Animated.View>
        </View>

        {/* Revenue Breakdown */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <Ionicons name="game-controller" size={20} color="#6366f1" />
                <Text style={styles.breakdownLabel}>Game Trials</Text>
              </View>
              <Text style={styles.breakdownValue}>$6,250</Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <Ionicons name="cart" size={20} color="#FF0066" />
                <Text style={styles.breakdownLabel}>In-App Purchases</Text>
              </View>
              <Text style={styles.breakdownValue}>$1,850</Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <Ionicons name="megaphone" size={20} color="#FFD700" />
                <Text style={styles.breakdownLabel}>Advertising</Text>
              </View>
              <Text style={styles.breakdownValue}>$320</Text>
            </View>
          </View>
        </View>

        {/* Revenue Share */}
        <View style={styles.revenueShareSection}>
          <Text style={styles.sectionTitle}>Revenue Sharing</Text>
          <View style={styles.revenueShareCard}>
            <View style={styles.shareItem}>
              <Text style={styles.shareLabel}>Your Share</Text>
              <Text style={styles.sharePercentage}>{revenueShare.developer}%</Text>
            </View>
            <View style={styles.shareVisual}>
              <View
                style={[
                  styles.shareBar,
                  { flex: revenueShare.developer, backgroundColor: '#00FF88' },
                ]}
              />
              <View
                style={[styles.shareBar, { flex: revenueShare.platform, backgroundColor: '#333' }]}
              />
            </View>
            <View style={styles.shareItem}>
              <Text style={styles.shareLabel}>Platform Fee</Text>
              <Text style={styles.sharePercentage}>{revenueShare.platform}%</Text>
            </View>
          </View>
          <Text style={styles.shareNote}>
            Industry-leading revenue share. You keep {revenueShare.developer}% of all earnings.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderPayouts = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.payoutsContent}>
        {/* Payout Settings */}
        <View style={styles.payoutSettings}>
          <Text style={styles.sectionTitle}>Payout Settings</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Minimum Payout</Text>
            <Text style={styles.settingValue}>${minimumPayout}</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Payout Schedule</Text>
            <Text style={styles.settingValue}>Weekly (Fridays)</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Processing Time</Text>
            <Text style={styles.settingValue}>3-5 business days</Text>
          </View>
        </View>

        {/* Payout History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Payout History</Text>
          {payoutHistory.map(payout => {
            const scaleAnim = getScaleAnim(payout.id);

            return (
              <Pressable
                key={payout.id}
                onPressIn={() => {
                  Animated.spring(scaleAnim, {
                    toValue: 0.98,
                    useNativeDriver: true,
                  }).start();
                }}
                onPressOut={() => {
                  Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                  }).start();
                }}
                onPress={() => {
                  haptics.impact('light');
                  // Show payout details
                }}
                style={styles.payoutItem}
              >
                <Animated.View
                  style={[styles.payoutContent, { transform: [{ scale: scaleAnim }] }]}
                >
                  <View style={styles.payoutLeft}>
                    <View style={styles.payoutHeader}>
                      <Text style={styles.payoutAmount}>${payout.amount.toFixed(2)}</Text>
                      <View
                        style={[
                          styles.payoutBadge,
                          payout.status === 'completed' && styles.payoutBadgeCompleted,
                          payout.status === 'processing' && styles.payoutBadgeProcessing,
                          payout.status === 'failed' && styles.payoutBadgeFailed,
                        ]}
                      >
                        <Text style={styles.payoutBadgeText}>{payout.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.payoutMethod}>{payout.method}</Text>
                    <Text style={styles.payoutDate}>
                      {payout.date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.payoutRight}>
                    <Text style={styles.payoutReference}>{payout.reference}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </View>
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );

  const renderSettings = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.settingsContent}>
        {/* Payment Methods */}
        <View style={styles.paymentMethodsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <Pressable
              onPress={() => {
                haptics.impact('light');
                // Add payment method
              }}
              style={styles.addButton}
            >
              <Ionicons name="add" size={20} color="#6366f1" />
            </Pressable>
          </View>

          {paymentMethods.map(method => (
            <View key={method.id} style={styles.paymentMethod}>
              <View style={styles.methodLeft}>
                <View style={[styles.methodIcon, { backgroundColor: '#6366f1' + '20' }]}>
                  <FontAwesome5
                    name={
                      (method.type === 'bank'
                        ? 'university'
                        : method.type === 'paypal'
                          ? 'paypal'
                          : 'credit-card') as any}
                    size={20}
                    color="#6366f1"
                  />
                </View>
                <View>
                  <Text style={styles.methodName}>{method.name}</Text>
                  <Text style={styles.methodDetails}>{method.details}</Text>
                </View>
              </View>
              <View style={styles.methodRight}>
                {method.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>DEFAULT</Text>
                  </View>
                )}
                <Pressable
                  onPress={() => {
                    haptics.impact('light');
                    // Edit payment method
                  }}
                  style={styles.editButton}
                >
                  <Ionicons name="pencil" size={16} color="#666" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Billing Information */}
        <View style={styles.billingSection}>
          <Text style={styles.sectionTitle}>Billing Information</Text>
          <View style={styles.billingCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Legal Name</Text>
              <TextInput
                style={styles.input}
                value="John Developer"
                placeholderTextColor="#666"
                editable={false}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business Name</Text>
              <TextInput
                style={styles.input}
                value="Awesome Games Studio"
                placeholderTextColor="#666"
                editable={false}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tax ID</Text>
              <TextInput
                style={styles.input}
                value="**-*****89"
                placeholderTextColor="#666"
                editable={false}
              />
            </View>
            <Pressable
              onPress={() => {
                haptics.impact('light');
                // Edit billing info
              }}
              style={styles.editBillingButton}
            >
              <Text style={styles.editBillingText}>Edit Billing Information</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderTax = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.taxContent}>
        {/* Tax Documents */}
        <View style={styles.taxSection}>
          <Text style={styles.sectionTitle}>Tax Documents</Text>
          {taxDocuments.map(doc => (
            <Pressable
              key={doc.id}
              onPress={() => {
                if (doc.status === 'available') {
                  haptics.impact('light');
                  // Download document
                }
              }}
              style={styles.taxDocument}
            >
              <View style={styles.docLeft}>
                <View style={styles.docIcon}>
                  <Ionicons name="document-text" size={24} color="#6366f1" />
                </View>
                <View>
                  <Text style={styles.docTitle}>{doc.type}</Text>
                  <Text style={styles.docYear}>Tax Year {doc.year}</Text>
                </View>
              </View>
              <View style={styles.docRight}>
                {doc.status === 'available' ? (
                  <Ionicons name="download" size={24} color="#6366f1" />
                ) : (
                  <Text style={styles.docProcessing}>Processing...</Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Tax Information */}
        <View style={styles.taxInfoSection}>
          <Text style={styles.sectionTitle}>Tax Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Ionicons name="information-circle" size={20} color="#6366f1" />
              <Text style={styles.infoText}>
                Tax documents are generated annually and will be available by January 31st.
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark" size={20} color="#00FF88" />
              <Text style={styles.infoText}>
                Your tax information is securely stored and encrypted.
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="help-circle" size={20} color="#FFD700" />
              <Text style={styles.infoText}>
                Consult with a tax professional for specific tax advice.
              </Text>
            </View>
          </View>
        </View>

        {/* Tax Settings */}
        <View style={styles.taxSettingsSection}>
          <Text style={styles.sectionTitle}>Tax Settings</Text>
          <Pressable
            onPress={() => {
              haptics.impact('light');
              // Update tax info
            }}
            style={styles.taxSettingButton}
          >
            <Text style={styles.taxSettingText}>Update Tax Information</Text>
            <Ionicons name="arrow-forward" size={20} color="#6366f1" />
          </Pressable>
          <Pressable
            onPress={() => {
              haptics.impact('light');
              // Submit W-9
            }}
            style={styles.taxSettingButton}
          >
            <Text style={styles.taxSettingText}>Submit W-9 Form</Text>
            <Ionicons name="arrow-forward" size={20} color="#6366f1" />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              haptics.impact('light');
              navigation.goBack();
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Monetization</Text>
          <Pressable
            onPress={() => {
              haptics.impact('light');
              // Handle support
            }}
            style={styles.supportButton}
          >
            <Ionicons name="help-circle-outline" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          <View style={styles.tabs}>
            {(['overview', 'payouts', 'settings', 'tax'] as const).map(tab => (
              <Pressable
                key={tab}
                onPress={() => {
                  haptics.selection();
                  setActiveTab(tab);
                }}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'payouts' && renderPayouts()}
          {activeTab === 'settings' && renderSettings()}
          {activeTab === 'tax' && renderTax()}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  supportButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#00FF88',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#00FF88',
  },
  tabContent: {
    flex: 1,
  },
  overviewContent: {
    padding: 24,
  },
  balanceContainer: {
    marginBottom: 32,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.6)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    alignSelf: 'flex-start',
    gap: 8,
  },
  payoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statHint: {
    fontSize: 12,
    color: '#999',
  },
  chartSection: {
    marginBottom: 32,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 4,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timeRangeButtonActive: {
    backgroundColor: '#00FF88',
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  timeRangeTextActive: {
    color: '#000000',
  },
  chartContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  breakdownSection: {
    marginBottom: 32,
  },
  breakdownCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  revenueShareSection: {
    marginBottom: 32,
  },
  revenueShareCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  shareItem: {
    alignItems: 'center',
  },
  shareLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sharePercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareVisual: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 20,
  },
  shareBar: {
    height: '100%',
  },
  shareNote: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  payoutsContent: {
    padding: 24,
  },
  payoutSettings: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#333',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  settingLabel: {
    fontSize: 16,
    color: '#999',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  historySection: {
    marginBottom: 32,
  },
  payoutItem: {
    marginTop: 12,
  },
  payoutContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  payoutLeft: {
    flex: 1,
  },
  payoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  payoutAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  payoutBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  payoutBadgeCompleted: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
  },
  payoutBadgeProcessing: {
    backgroundColor: 'rgba(255, 170, 0, 0.2)',
  },
  payoutBadgeFailed: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
  },
  payoutBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  payoutMethod: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  payoutDate: {
    fontSize: 12,
    color: '#666',
  },
  payoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payoutReference: {
    fontSize: 12,
    color: '#666',
  },
  settingsContent: {
    padding: 24,
  },
  paymentMethodsSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  methodDetails: {
    fontSize: 14,
    color: '#666',
  },
  methodRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  defaultBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#00FF88',
  },
  editButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billingSection: {
    marginBottom: 32,
  },
  billingCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  editBillingButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editBillingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  taxContent: {
    padding: 24,
  },
  taxSection: {
    marginBottom: 32,
  },
  taxDocument: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  docYear: {
    fontSize: 14,
    color: '#666',
  },
  docRight: {
    alignItems: 'center',
  },
  docProcessing: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  taxInfoSection: {
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  taxSettingsSection: {
    marginBottom: 32,
  },
  taxSettingButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  taxSettingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
