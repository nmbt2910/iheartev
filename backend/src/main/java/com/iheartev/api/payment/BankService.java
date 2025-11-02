package com.iheartev.api.payment;

import org.springframework.stereotype.Service;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
public class BankService {
    // Static list of major Vietnamese banks with their codes
    private static final List<Bank> BANKS = Arrays.asList(
        new Bank("970415", "Vietcombank", "Ngân hàng TMCP Ngoại Thương Việt Nam"),
        new Bank("970416", "VietinBank", "Ngân hàng TMCP Công Thương Việt Nam"),
        new Bank("970403", "BIDV", "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam"),
        new Bank("970422", "Agribank", "Ngân hàng Nông nghiệp và Phát triển Nông thôn"),
        new Bank("970437", "ACB", "Ngân hàng TMCP Á Châu"),
        new Bank("970406", "Sacombank", "Ngân hàng TMCP Sài Gòn Thương Tín"),
        new Bank("970431", "Techcombank", "Ngân hàng TMCP Kỹ Thương Việt Nam"),
        new Bank("970443", "VPBank", "Ngân hàng TMCP Việt Nam Thịnh Vượng"),
        new Bank("970414", "MBBank", "Ngân hàng TMCP Quân Đội"),
        new Bank("970423", "TPBank", "Ngân hàng TMCP Tiên Phong"),
        new Bank("970441", "MSB", "Ngân hàng TMCP Hàng Hải"),
        new Bank("970424", "HDBank", "Ngân hàng TMCP Phát Triển Thành Phố Hồ Chí Minh"),
        new Bank("970427", "OCB", "Ngân hàng TMCP Phương Đông"),
        new Bank("970448", "VIB", "Ngân hàng TMCP Quốc Tế Việt Nam"),
        new Bank("970452", "SHB", "Ngân hàng TMCP Sài Gòn - Hà Nội"),
        new Bank("970454", "Eximbank", "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam"),
        new Bank("970458", "PGBank", "Ngân hàng TMCP Xăng Dầu Petrolimex"),
        new Bank("970429", "ABBank", "Ngân hàng TMCP An Bình")
    );

    public List<Bank> getAllBanks() {
        return BANKS;
    }

    public Optional<Bank> getBankByCode(String code) {
        return BANKS.stream()
                .filter(bank -> bank.getCode().equals(code))
                .findFirst();
    }

    public static class Bank {
        private String code;
        private String shortName;
        private String fullName;

        public Bank(String code, String shortName, String fullName) {
            this.code = code;
            this.shortName = shortName;
            this.fullName = fullName;
        }

        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getShortName() { return shortName; }
        public void setShortName(String shortName) { this.shortName = shortName; }
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
    }
}

