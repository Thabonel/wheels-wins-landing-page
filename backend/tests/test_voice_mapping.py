"""
Tests for Voice Mapping System
Comprehensive test suite for the TTS voice mapping functionality.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from app.services.tts.voice_mapping import (
    VoiceMappingService, VoiceMapping, VoiceCharacteristic,
    voice_mapping_service, get_voice_mapping_service
)


class TestVoiceMappingService:
    """Test suite for VoiceMappingService"""
    
    def setup_method(self):
        """Setup test environment"""
        self.service = VoiceMappingService()
    
    def test_initialization(self):
        """Test service initialization"""
        assert len(self.service.voice_mappings) > 0
        assert len(self.service.characteristic_index) > 0
        assert len(self.service.quality_rankings) > 0
        
        # Check that default voice exists
        assert "pam_default" in self.service.voice_mappings
        
        # Check that quality rankings are sorted
        quality_scores = [
            self.service.voice_mappings[voice_id].quality_score 
            for voice_id in self.service.quality_rankings
        ]
        assert quality_scores == sorted(quality_scores, reverse=True)
    
    def test_get_engine_voice_id_valid_mapping(self):
        """Test getting engine-specific voice IDs for valid mappings"""
        # Test Edge TTS mapping
        edge_voice = self.service.get_engine_voice_id("pam_female_professional", "edge")
        assert edge_voice == "en-US-JennyNeural"
        
        # Test Coqui TTS mapping  
        coqui_voice = self.service.get_engine_voice_id("pam_female_friendly", "coqui")
        assert coqui_voice == "p225"
        
        # Test System TTS mapping
        system_voice = self.service.get_engine_voice_id("pam_male_calm", "system")
        assert system_voice == "default_male"
        
        # Test Supabase TTS mapping
        supabase_voice = self.service.get_engine_voice_id("pam_default", "supabase")
        assert supabase_voice == "nari-dia"
    
    def test_get_engine_voice_id_invalid_mapping(self):
        """Test fallback behavior for invalid mappings"""
        # Test unknown voice ID
        fallback_voice = self.service.get_engine_voice_id("unknown_voice", "edge")
        assert fallback_voice == "en-US-JennyNeural"  # Fallback for Edge TTS
        
        # Test unknown engine
        result = self.service.get_engine_voice_id("pam_default", "unknown_engine")
        assert result is None
    
    def test_legacy_voice_id_resolution(self):
        """Test resolution of legacy voice IDs"""
        # Test Coqui legacy IDs
        assert self.service._resolve_legacy_voice_id("p225") == "pam_female_friendly"
        assert self.service._resolve_legacy_voice_id("p228") == "pam_male_professional"
        assert self.service._resolve_legacy_voice_id("p267") == "pam_female_professional"
        
        # Test Edge TTS legacy IDs
        assert self.service._resolve_legacy_voice_id("en-US-JennyNeural") == "pam_female_professional"
        assert self.service._resolve_legacy_voice_id("en-US-AriaNeural") == "pam_female_friendly"
        
        # Test unknown legacy ID
        assert self.service._resolve_legacy_voice_id("unknown_voice") is None
    
    def test_find_voice_by_characteristics(self):
        """Test finding voices by characteristics"""
        # Test gender-based search
        female_voice = self.service.find_voice_by_characteristics(gender="female")
        female_mapping = self.service.voice_mappings[female_voice]
        assert female_mapping.gender == VoiceCharacteristic.GENDER_FEMALE
        
        # Test style-based search
        professional_voice = self.service.find_voice_by_characteristics(style="professional")
        professional_mapping = self.service.voice_mappings[professional_voice]
        assert professional_mapping.style == VoiceCharacteristic.STYLE_PROFESSIONAL
        
        # Test combined characteristics
        calm_male_voice = self.service.find_voice_by_characteristics(
            gender="male", style="calm"
        )
        calm_male_mapping = self.service.voice_mappings[calm_male_voice]
        assert calm_male_mapping.gender == VoiceCharacteristic.GENDER_MALE
        assert calm_male_mapping.style == VoiceCharacteristic.STYLE_CALM
        
        # Test context-based search
        travel_voice = self.service.find_voice_by_characteristics(context="travel_planning")
        assert travel_voice == "pam_travel_guide"
        
        financial_voice = self.service.find_voice_by_characteristics(context="financial")
        assert financial_voice == "pam_financial_advisor"
    
    def test_get_voice_info(self):
        """Test getting comprehensive voice information"""
        voice_info = self.service.get_voice_info("pam_female_professional")
        
        assert voice_info is not None
        assert voice_info["generic_id"] == "pam_female_professional"
        assert voice_info["display_name"] == "PAM Professional (Female)"
        assert voice_info["characteristics"]["gender"] == "female"
        assert voice_info["characteristics"]["style"] == "professional"
        assert voice_info["engine_mappings"]["edge"] == "en-US-JennyNeural"
        assert voice_info["engine_mappings"]["coqui"] == "p267"
        assert voice_info["quality_score"] > 0
        
        # Test with legacy voice ID
        legacy_info = self.service.get_voice_info("p225")
        assert legacy_info is None  # get_voice_info doesn't resolve legacy IDs
    
    def test_get_available_voices(self):
        """Test getting list of available voices"""
        # Test all voices
        all_voices = self.service.get_available_voices()
        assert len(all_voices) > 0
        
        # Check that voices are sorted by quality
        quality_scores = [voice["quality_score"] for voice in all_voices]
        assert quality_scores == sorted(quality_scores, reverse=True)
        
        # Test engine-specific voices
        edge_voices = self.service.get_available_voices(engine="edge")
        assert len(edge_voices) > 0
        
        # All edge voices should have edge mappings
        for voice in edge_voices:
            assert voice["engine_mappings"]["edge"] is not None
    
    def test_get_recommended_voices_for_context(self):
        """Test context-based voice recommendations"""
        # Test travel context
        travel_recommendations = self.service.get_recommended_voices_for_context("travel_planning")
        assert "pam_travel_guide" in travel_recommendations
        assert len(travel_recommendations) <= 3
        
        # Test financial context
        financial_recommendations = self.service.get_recommended_voices_for_context("financial")
        assert "pam_financial_advisor" in financial_recommendations
        
        # Test emergency context
        emergency_recommendations = self.service.get_recommended_voices_for_context("emergency")
        assert "pam_emergency" in emergency_recommendations
        
        # Test unknown context (should fallback to quality ranking)
        unknown_recommendations = self.service.get_recommended_voices_for_context("unknown_context")
        assert len(unknown_recommendations) > 0
    
    def test_validate_voice_mapping(self):
        """Test voice mapping validation"""
        # Test valid mapping
        is_valid, message = self.service.validate_voice_mapping("pam_default", "edge")
        assert is_valid is True
        assert "Valid mapping" in message
        
        # Test invalid voice ID
        is_valid, message = self.service.validate_voice_mapping("unknown_voice", "edge")
        assert is_valid is False
        assert "not found" in message
        
        # Test invalid engine
        is_valid, message = self.service.validate_voice_mapping("pam_default", "unknown_engine")
        assert is_valid is False
        assert "No unknown_engine voice mapping" in message
    
    def test_get_mapping_stats(self):
        """Test getting mapping statistics"""
        stats = self.service.get_mapping_stats()
        
        assert "total_voices" in stats
        assert stats["total_voices"] > 0
        
        assert "engine_coverage" in stats
        assert "edge" in stats["engine_coverage"]
        assert "coqui" in stats["engine_coverage"]
        
        assert "quality_distribution" in stats
        assert "high" in stats["quality_distribution"]
        assert "medium" in stats["quality_distribution"]
        
        assert "characteristic_distribution" in stats
        assert "female" in stats["characteristic_distribution"]
        assert "male" in stats["characteristic_distribution"]
        
        assert "last_updated" in stats
    
    def test_fallback_voice_id(self):
        """Test fallback voice ID generation"""
        # Test different engines
        edge_fallback = self.service._get_fallback_voice_id("edge")
        assert edge_fallback == "en-US-JennyNeural"
        
        coqui_fallback = self.service._get_fallback_voice_id("coqui")
        assert coqui_fallback == "p225"
        
        system_fallback = self.service._get_fallback_voice_id("system")
        assert system_fallback == "default_female"
        
        supabase_fallback = self.service._get_fallback_voice_id("supabase")
        assert supabase_fallback == "nari-dia"
        
        unknown_fallback = self.service._get_fallback_voice_id("unknown")
        assert unknown_fallback == "default"


class TestVoiceMapping:
    """Test suite for VoiceMapping dataclass"""
    
    def test_voice_mapping_creation(self):
        """Test creating voice mapping objects"""
        mapping = VoiceMapping(
            generic_id="test_voice",
            display_name="Test Voice",
            description="A test voice",
            gender=VoiceCharacteristic.GENDER_FEMALE,
            age=VoiceCharacteristic.AGE_YOUNG,
            accent=VoiceCharacteristic.ACCENT_AMERICAN,
            style=VoiceCharacteristic.STYLE_FRIENDLY,
            quality_score=8.5,
            edge_voice_id="en-US-TestNeural",
            coqui_voice_id="test123"
        )
        
        assert mapping.generic_id == "test_voice"
        assert mapping.quality_score == 8.5
        assert mapping.edge_voice_id == "en-US-TestNeural"
        assert mapping.coqui_voice_id == "test123"
        assert mapping.languages == ["en-US"]  # Default value
        assert mapping.is_neural is True  # Default value
    
    def test_voice_mapping_post_init(self):
        """Test post-initialization defaults"""
        mapping = VoiceMapping(
            generic_id="test_voice",
            display_name="Test Voice", 
            description="A test voice",
            gender=VoiceCharacteristic.GENDER_FEMALE,
            age=VoiceCharacteristic.AGE_YOUNG,
            accent=VoiceCharacteristic.ACCENT_AMERICAN,
            style=VoiceCharacteristic.STYLE_FRIENDLY,
            quality_score=8.5,
            languages=None  # Test default assignment
        )
        
        assert mapping.languages == ["en-US"]


class TestGlobalVoiceMappingService:
    """Test suite for global voice mapping service instance"""
    
    def test_global_service_instance(self):
        """Test that global service instance is properly initialized"""
        global_service = get_voice_mapping_service()
        
        assert global_service is not None
        assert isinstance(global_service, VoiceMappingService)
        assert len(global_service.voice_mappings) > 0
        
        # Test that multiple calls return the same instance
        another_service = get_voice_mapping_service()
        assert global_service is another_service
    
    def test_voice_mapping_service_singleton(self):
        """Test that voice_mapping_service is a singleton"""
        service1 = voice_mapping_service
        service2 = get_voice_mapping_service()
        
        assert service1 is service2
        assert isinstance(service1, VoiceMappingService)


class TestIntegrationScenarios:
    """Integration test scenarios for voice mapping system"""
    
    def setup_method(self):
        """Setup test environment"""
        self.service = VoiceMappingService()
    
    def test_legacy_migration_scenario(self):
        """Test migration from legacy voice IDs"""
        # Simulate existing system using legacy Coqui voice ID
        legacy_voice_id = "p225"
        
        # System should be able to resolve this to generic ID
        resolved_generic = self.service._resolve_legacy_voice_id(legacy_voice_id)
        assert resolved_generic == "pam_female_friendly"
        
        # System should be able to map to different engines
        edge_voice = self.service.get_engine_voice_id(resolved_generic, "edge")
        coqui_voice = self.service.get_engine_voice_id(resolved_generic, "coqui")
        
        assert edge_voice == "en-US-AriaNeural"
        assert coqui_voice == "p225"  # Should map back to original
    
    def test_context_aware_voice_selection(self):
        """Test intelligent voice selection based on context"""
        # Test different contexts should select appropriate voices
        contexts_and_expected = [
            ("travel_planning", "pam_travel_guide"),
            ("budget_management", "pam_financial_advisor"),
            ("emergency", "pam_emergency"),
            ("professional", "pam_female_professional"),
            ("casual", "pam_female_friendly")
        ]
        
        for context, expected_voice in contexts_and_expected:
            recommended_voices = self.service.get_recommended_voices_for_context(context, limit=1)
            assert len(recommended_voices) > 0
            assert recommended_voices[0] == expected_voice
    
    def test_cross_engine_compatibility(self):
        """Test that all voices have mappings for available engines"""
        problematic_voices = []
        
        for voice_id in self.service.voice_mappings:
            mapping = self.service.voice_mappings[voice_id]
            
            # Check that at least Edge and Coqui mappings exist
            if not mapping.edge_voice_id:
                problematic_voices.append(f"{voice_id}: missing Edge TTS mapping")
            
            if not mapping.coqui_voice_id:
                problematic_voices.append(f"{voice_id}: missing Coqui TTS mapping")
        
        # Assert that all voices have required mappings
        assert len(problematic_voices) == 0, f"Missing mappings: {problematic_voices}"
    
    def test_voice_quality_distribution(self):
        """Test that voice quality scores are properly distributed"""
        quality_scores = [
            mapping.quality_score 
            for mapping in self.service.voice_mappings.values()
        ]
        
        # Should have voices across quality spectrum
        assert min(quality_scores) >= 7.0  # Minimum quality threshold
        assert max(quality_scores) <= 10.0  # Maximum quality threshold
        
        # Should have some high-quality voices
        high_quality_count = sum(1 for score in quality_scores if score >= 9.0)
        assert high_quality_count > 0
    
    @pytest.mark.parametrize("engine", ["edge", "coqui", "system", "supabase"])
    def test_engine_specific_fallbacks(self, engine):
        """Test that each engine has proper fallback behavior"""
        # Test with unknown voice ID
        fallback_voice = self.service.get_engine_voice_id("unknown_voice_id", engine)
        
        # Should get a fallback voice, not None
        assert fallback_voice is not None
        assert len(fallback_voice) > 0
        
        # Fallback should be appropriate for the engine
        if engine == "edge":
            assert "Neural" in fallback_voice or fallback_voice.startswith("en-")
        elif engine == "coqui":
            assert fallback_voice.startswith("p") or fallback_voice == "p225"
        elif engine == "system":
            assert "default" in fallback_voice.lower()
        elif engine == "supabase":
            assert fallback_voice in ["nari-dia", "default"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])