import React, { useState, useEffect, useRef } from "react";
import { Card, Button, Modal, Input, message, Upload, Spin, Tag, Row, Col, Typography } from "antd";
import { CameraOutlined, EnvironmentOutlined, CheckCircleOutlined } from "@ant-design/icons";
import SignatureCanvas from "react-signature-canvas";
import api from "../../../../api/client.js";
import { startTracking, stopTracking } from "./GpsTracker.js";

const { Title, Text } = Typography;

export default function DriverApp() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [podModalVisible, setPodModalVisible] = useState(false);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [podNotes, setPodNotes] = useState("");
  const sigCanvas = useRef(null);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      // Typically we'd filter by driver_id based on logged in user, mock for now
      const res = await api.get("/transport/trips");
      if (res.data?.success) {
        // Filter to only show IN_TRANSIT or SCHEDULED for mobile
        const activeTrips = (res.data.data.items || []).filter(t => t.status !== 'CANCELLED' && t.status !== 'COMPLETED');
        setTrips(activeTrips);
      }
    } catch (err) {
      message.error("Failed to load your trips.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
    return () => {
      stopTracking();
    };
  }, []);

  const handleStartTrip = async (tripId) => {
    const success = startTracking(tripId);
    if (success) {
      message.success("Trip Started! GPS tracking active.");
      // Ideally update backend status to IN_TRANSIT here
    }
  };

  const handleOpenPod = (tripId) => {
    setCurrentTripId(tripId);
    setPodModalVisible(true);
  };

  const handleCompleteTrip = async () => {
    if (sigCanvas.current.isEmpty()) {
      message.warning("Please provide a signature");
      return;
    }
    
    const signatureDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
    
    try {
      await api.post(`/transport/trips/${currentTripId}/pod`, {
        pod_signature_url: signatureDataUrl,
        pod_photo_url: null, // Hook up real photo upload here
        pod_notes: podNotes
      });
      message.success("Proof of Delivery submitted!");
      setPodModalVisible(false);
      stopTracking();
      fetchTrips();
    } catch (err) {
      message.error("Failed to submit POD");
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>;

  return (
    <div style={{ padding: 16, background: "#f0f2f5", minHeight: "100vh" }}>
      <Title level={4}>My Active Trips</Title>
      
      {trips.length === 0 ? (
        <Card>
          <Text type="secondary">You have no active trips assigned.</Text>
        </Card>
      ) : (
        trips.map(trip => (
          <Card key={trip.id} style={{ marginBottom: 16, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Title level={5} style={{ margin: 0 }}>Trip #{trip.trip_number}</Title>
              <Tag color={trip.status === 'IN_TRANSIT' ? 'processing' : 'default'}>{trip.status}</Tag>
            </div>
            
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Route ID: {trip.route_id || "Unassigned"} <br/>
              Vehicle: {trip.reg_number}
            </Text>

            <Row gutter={8}>
              <Col span={12}>
                <Button 
                  type="primary" 
                  block 
                  icon={<EnvironmentOutlined />}
                  onClick={() => handleStartTrip(trip.id)}
                  disabled={trip.status === 'IN_TRANSIT'}
                >
                  Start GPS
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  type="primary" 
                  danger 
                  block 
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleOpenPod(trip.id)}
                >
                  Complete
                </Button>
              </Col>
            </Row>
          </Card>
        ))
      )}

      {/* Proof of Delivery Modal */}
      <Modal
        title="Proof of Delivery"
        open={podModalVisible}
        onOk={handleCompleteTrip}
        onCancel={() => setPodModalVisible(false)}
        okText="Submit & Complete"
        width={400}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Customer Signature</Text>
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, marginTop: 8, background: '#fafafa' }}>
            <SignatureCanvas 
              ref={sigCanvas} 
              canvasProps={{ width: 350, height: 150, className: 'sigCanvas' }} 
            />
          </div>
          <Button size="small" type="link" onClick={() => sigCanvas.current.clear()}>Clear Signature</Button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text strong>Delivery Photo (Optional)</Text>
          <Upload maxCount={1} accept="image/*">
            <Button icon={<CameraOutlined />} block style={{ marginTop: 8 }}>
              Take Photo
            </Button>
          </Upload>
        </div>

        <div>
          <Text strong>Delivery Notes</Text>
          <Input.TextArea 
            rows={3} 
            style={{ marginTop: 8 }} 
            value={podNotes}
            onChange={(e) => setPodNotes(e.target.value)}
            placeholder="Condition of goods, receiver name, etc."
          />
        </div>
      </Modal>
    </div>
  );
}
